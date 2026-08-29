import * as cdk from 'aws-cdk-lib';
import * as glue from 'aws-cdk-lib/aws-glue';
import * as athena from 'aws-cdk-lib/aws-athena';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface VisitorAnalyticsProps {
  stage: string;
  resourcePrefix: string;
  /** The CloudFront access-log bucket. Also holds enrichment data + query results. */
  logBucket: s3.Bucket;
  /** ASNs treated as noise (consumer ISPs, hosting, cloud). Format: 'AS7922'. */
  ispExclusionAsns: string[];
}

/**
 * Company-level visitor identification over the CloudFront access logs.
 *
 * Everything here is L1 CloudFormation (Glue + Athena). That is deliberate:
 * SCP `DenyLambdaWithoutVPC` blocks Lambda creation outside a VPC in this
 * account, which rules out every CDK construct backed by a custom resource
 * (BucketDeployment, autoDeleteObjects, ...). Glue/Athena resources need none.
 *
 * The IP database itself is loaded by .github/workflows/refresh-ip-data.yml —
 * CDK cannot fetch a third-party file at deploy time without a custom resource.
 */
export class VisitorAnalytics extends Construct {
  public readonly databaseName: string;
  public readonly workGroupName: string;

  constructor(scope: Construct, id: string, props: VisitorAnalyticsProps) {
    super(scope, id);

    const { stage, resourcePrefix, logBucket, ispExclusionAsns } = props;

    // Glue names allow only lowercase alphanumerics + underscore.
    const dbName = `${resourcePrefix.replace(/-/g, '_')}_analytics_${stage}`;
    const wgName = `${resourcePrefix}-analytics-${stage}`;
    this.databaseName = dbName;
    this.workGroupName = wgName;

    const bucket = logBucket.bucketName;

    const database = new glue.CfnDatabase(this, 'Database', {
      catalogId: cdk.Stack.of(this).account,
      databaseInput: {
        name: dbName,
        description: `CloudFront visitor analytics for ${resourcePrefix} (${stage})`,
      },
    });

    // ---------------------------------------------------------------------
    // CloudFront standard (legacy) access logs.
    //
    // Gzipped, tab-separated, 33 columns, two '#' header lines. The column
    // order is POSITIONAL and matches the '#Fields:' line emitted by
    // CloudFront — do not reorder.
    //
    // Location is pinned to the cloudfront-logs/ prefix, not the bucket root:
    // the same bucket also holds enrichment/ and athena-results/, and Athena
    // would otherwise try to parse those as TSV.
    // ---------------------------------------------------------------------
    const cfLogColumns = [
      'date', 'time', 'x_edge_location', 'sc_bytes', 'c_ip', 'cs_method',
      'cs_host', 'cs_uri_stem', 'sc_status', 'cs_referer', 'cs_user_agent',
      'cs_uri_query', 'cs_cookie', 'x_edge_result_type', 'x_edge_request_id',
      'x_host_header', 'cs_protocol', 'cs_bytes', 'time_taken',
      'x_forwarded_for', 'ssl_protocol', 'ssl_cipher',
      'x_edge_response_result_type', 'cs_protocol_version', 'fle_status',
      'fle_encrypted_fields', 'c_port', 'time_to_first_byte',
      'x_edge_detailed_result_type', 'sc_content_type', 'sc_content_len',
      'sc_range_start', 'sc_range_end',
    ].map((name) => ({ name, type: 'string' }));

    const logsTable = new glue.CfnTable(this, 'CloudFrontLogsTable', {
      catalogId: cdk.Stack.of(this).account,
      databaseName: dbName,
      tableInput: {
        name: 'cloudfront_logs',
        description: 'CloudFront standard access logs (tab-separated, gzipped)',
        tableType: 'EXTERNAL_TABLE',
        parameters: {
          // Two '#' comment lines precede the data in every file.
          'skip.header.line.count': '2',
          classification: 'csv',
        },
        storageDescriptor: {
          columns: cfLogColumns,
          location: `s3://${bucket}/cloudfront-logs/`,
          inputFormat: 'org.apache.hadoop.mapred.TextInputFormat',
          outputFormat: 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat',
          compressed: true,
          serdeInfo: {
            serializationLibrary: 'org.apache.hadoop.hive.serde2.lazy.LazySimpleSerDe',
            parameters: { 'field.delim': '\t', 'serialization.format': '\t' },
          },
        },
      },
    });
    logsTable.addDependency(database);

    // ---------------------------------------------------------------------
    // IPinfo Lite IP->organization ranges.
    //
    // Real header (verified against ipinfo/sample-database):
    //   network,country,country_code,continent,continent_code,asn,as_name,as_domain
    //
    // Two things drive the SerDe choice:
    //  - `network` is a CIDR ('1.0.0.0/24'), NOT start_ip/end_ip, so the
    //    queries below expand it to an integer range.
    //  - as_name is quoted and may contain commas ("Cloudflare, Inc."), so
    //    LazySimpleSerDe would split it across columns. OpenCSVSerde handles
    //    the quoting (and returns every column as a string).
    // ---------------------------------------------------------------------
    const ipRangesTable = new glue.CfnTable(this, 'IpRangesTable', {
      catalogId: cdk.Stack.of(this).account,
      databaseName: dbName,
      tableInput: {
        name: 'ip_ranges',
        description: 'IPinfo Lite IP-to-organization ranges (CIDR keyed)',
        tableType: 'EXTERNAL_TABLE',
        parameters: {
          'skip.header.line.count': '1',
          classification: 'csv',
        },
        storageDescriptor: {
          columns: [
            'network', 'country', 'country_code', 'continent',
            'continent_code', 'asn', 'as_name', 'as_domain',
          ].map((name) => ({ name, type: 'string' })),
          location: `s3://${bucket}/enrichment/ipinfo-lite/`,
          inputFormat: 'org.apache.hadoop.mapred.TextInputFormat',
          outputFormat: 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat',
          compressed: true,
          serdeInfo: {
            serializationLibrary: 'org.apache.hadoop.hive.serde2.OpenCSVSerde',
            parameters: {
              separatorChar: ',',
              quoteChar: '"',
              escapeChar: '\\',
            },
          },
        },
      },
    });
    ipRangesTable.addDependency(database);

    const workGroup = new athena.CfnWorkGroup(this, 'WorkGroup', {
      name: wgName,
      description: `Visitor analytics queries for ${resourcePrefix} (${stage})`,
      state: 'ENABLED',
      recursiveDeleteOption: true,
      workGroupConfiguration: {
        // Force every query to use this workgroup's output location + encryption
        // so a stray console setting can't write unencrypted results (the
        // DenyUnencryptedS3Uploads SCP would reject those anyway).
        enforceWorkGroupConfiguration: true,
        publishCloudWatchMetricsEnabled: true,
        resultConfiguration: {
          outputLocation: `s3://${bucket}/athena-results/`,
          encryptionConfiguration: { encryptionOption: 'SSE_S3' },
        },
      },
    });

    // ---- Shared SQL fragments -------------------------------------------

    const q = (name: string, description: string, sql: string) => {
      const nq = new athena.CfnNamedQuery(this, name, {
        database: dbName,
        name: `${name} (${stage})`,
        description,
        queryString: sql,
        workGroup: wgName,
      });
      nq.addDependency(workGroup);
      nq.addDependency(logsTable);
      nq.addDependency(ipRangesTable);
      return nq;
    };

    // Dotted-quad -> integer, for the range join. Trino has no built-in helper.
    const ipToInt = (expr: string) => `
      CAST(split_part(${expr}, '.', 1) AS BIGINT) * 16777216
    + CAST(split_part(${expr}, '.', 2) AS BIGINT) * 65536
    + CAST(split_part(${expr}, '.', 3) AS BIGINT) * 256
    + CAST(split_part(${expr}, '.', 4) AS BIGINT)`;

    // Bots are the majority of raw traffic. Cloudflare filters them for you;
    // Athena does not. UA matching alone is not enough — a real scanner seen in
    // these logs identifies itself as "Hello from Palo Alto Networks" and
    // another sends a plain Chrome UA from EC2 — so the ASN exclusion list
    // below does at least as much work as this regex.
    const botRegex = "'bot|crawl|spider|slurp|facebookexternalhit|headless|monitor|preview|scan|probe|curl|wget|python-requests|go-http|java/|okhttp|libwww|httpclient'";

    const pageViews = `
  page_views AS (
    SELECT
      "date"                          AS visit_date,
      c_ip,
      cs_uri_stem,
      cs_referer,
      url_decode(cs_user_agent)       AS user_agent
    FROM "${dbName}"."cloudfront_logs"
    WHERE sc_status = '200'
      -- HTML page hits only. Counting assets would multiply one visit by ~40.
      -- Observed in these logs: the URI is recorded as '/' (the CloudFront
      -- Function rewrite to /index.html happens after logging).
      AND (cs_uri_stem = '/' OR cs_uri_stem LIKE '%/' OR cs_uri_stem LIKE '%.html')
      AND NOT regexp_like(lower(url_decode(cs_user_agent)), ${botRegex})
  )`;

    // IPinfo ships IPv6 rows too; they break the IPv4 math, so drop them here.
    const ranges = `
  ranges AS (
    SELECT
      asn, as_name, as_domain, country,
      net_start,
      net_start + CAST(pow(2, 32 - prefix_len) AS BIGINT) - 1 AS net_end
    FROM (
      SELECT
        asn, as_name, as_domain, country,
        ${ipToInt("split_part(network, '/', 1)")} AS net_start,
        CAST(split_part(network, '/', 2) AS INTEGER) AS prefix_len
      FROM "${dbName}"."ip_ranges"
      WHERE network NOT LIKE '%:%'
        AND network <> 'network'
    )
  )`;

    // Resolve DISTINCT ips first: that keeps the non-equi range join small
    // (a few hundred addresses against ~1M CIDRs) instead of joining every row.
    const resolvedIps = `
  visitor_ips AS (
    SELECT DISTINCT c_ip, ${ipToInt('c_ip')} AS ip_int
    FROM page_views
    WHERE c_ip NOT LIKE '%:%'
  ),
  resolved AS (
    SELECT v.c_ip, r.asn, r.as_name, r.as_domain, r.country
    FROM visitor_ips v
    JOIN ranges r ON v.ip_int BETWEEN r.net_start AND r.net_end
  )`;

    const exclusions = ispExclusionAsns.length
      ? ispExclusionAsns.map((a) => `'${a}'`).join(', ')
      : "''";

    q(
      'OrganizationsByVisits',
      'Headline report: which organizations read the CV, most active first.',
      `-- Organizations that visited, most active first.
-- ISP/hosting ASNs are excluded: reverse-IP resolves those to the network
-- owner (Comcast, AWS) rather than an employer, so they are noise.
WITH${pageViews},${ranges},${resolvedIps}
SELECT
  r.as_name                        AS organization,
  r.as_domain                      AS domain,
  r.country,
  r.asn,
  COUNT(*)                         AS page_views,
  COUNT(DISTINCT p.visit_date)     AS days_active,
  COUNT(DISTINCT p.c_ip)           AS distinct_ips,
  MIN(p.visit_date)                AS first_seen,
  MAX(p.visit_date)                AS last_seen
FROM page_views p
JOIN resolved r ON p.c_ip = r.c_ip
WHERE r.asn NOT IN (${exclusions})
GROUP BY r.as_name, r.as_domain, r.country, r.asn
ORDER BY page_views DESC
LIMIT 100;`,
    );

    q(
      'OrganizationDetail',
      'Drill-down: every page view from one organization. Edit the as_domain filter.',
      `-- What did one organization actually read?
-- Replace the domain below with a value from the OrganizationsByVisits report.
WITH${pageViews},${ranges},${resolvedIps}
SELECT
  p.visit_date,
  r.as_name        AS organization,
  p.cs_uri_stem    AS page,
  p.cs_referer     AS referrer,
  p.user_agent,
  p.c_ip
FROM page_views p
JOIN resolved r ON p.c_ip = r.c_ip
WHERE r.as_domain = 'example.com'   -- <-- EDIT ME
ORDER BY p.visit_date DESC
LIMIT 500;`,
    );

    q(
      'MatchRateDiagnostics',
      'How much of the traffic actually resolves. Read this before trusting the reports.',
      `-- Diagnostics. Reverse-IP identification only works when someone browses
-- from a corporate network, so a LOW named-org share is the expected result,
-- not a bug: remote work, mobile carrier NAT and iCloud Private Relay all
-- defeat it. Typical real-world company-level match rates are 5-15%.
--
-- If 'named_org_pct' is near zero, check that enrichment/ipinfo-lite/ is
-- populated before concluding anything about the traffic itself.
WITH${pageViews},${ranges},${resolvedIps},
  totals AS (
    SELECT
      COUNT(*)                                                   AS all_page_views,
      COUNT(DISTINCT c_ip)                                       AS all_ips,
      COUNT(DISTINCT CASE WHEN c_ip LIKE '%:%' THEN c_ip END)    AS ipv6_ips_skipped
    FROM page_views
  ),
  matched AS (
    SELECT
      COUNT(DISTINCT c_ip)                                                        AS resolved_ips,
      COUNT(DISTINCT CASE WHEN asn NOT IN (${exclusions}) THEN c_ip END)          AS named_org_ips
    FROM resolved
  )
SELECT
  t.all_page_views,
  t.all_ips,
  t.ipv6_ips_skipped,
  m.resolved_ips,
  m.named_org_ips,
  ROUND(100.0 * m.resolved_ips  / NULLIF(t.all_ips, 0), 1) AS resolved_pct,
  ROUND(100.0 * m.named_org_ips / NULLIF(t.all_ips, 0), 1) AS named_org_pct
FROM totals t CROSS JOIN matched m;`,
    );

    new cdk.CfnOutput(this, 'AnalyticsDatabase', {
      value: dbName,
      description: 'Glue database holding the visitor-analytics tables',
    });

    new cdk.CfnOutput(this, 'AnalyticsWorkGroup', {
      value: wgName,
      description: 'Athena workgroup — saved queries live here',
    });
  }
}
