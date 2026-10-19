/**
 * The one place this repo names the landing zone it deploys under.
 *
 * WHY THIS FILE EXISTS. The tag below is what excepts a principal or a resource
 * from the landing zone's network perimeter. A tag key that turns off a security
 * control is not CV material, and it was previously restated in nine places
 * across the stacks, the tests, `CLAUDE.md`, `CONTEXT.md`, `BACKLOG.md` and a
 * published `knowledge/` file that the chat assistant reads aloud to any visitor
 * who asks. Collapsing it to one constant means the prose can point at a name
 * instead of repeating a key, and a fork can change it in one edit.
 *
 * WHAT THIS DOES NOT DO. It does not make the value secret. It is still in this
 * public repository and in every commit that preceded this one, so if the key
 * is considered sensitive the only real mitigation is to rename it in the
 * landing-zone configuration, which this repo deliberately does not control.
 * See the *Don'ts* in `CLAUDE.md`.
 *
 * WHY IT IS NOT READ FROM CONFIG. Sourcing it from `cdk.json` context or a
 * GitHub variable would keep it out of git, at the cost of a failure mode with
 * no deploy-time symptom: an unset value synths and deploys cleanly, then the
 * function is denied on its first DynamoDB write at runtime. That trade was
 * raised with the owner rather than taken unilaterally.
 */

/**
 * Tag key granting an exception from the network perimeter only, not from the
 * other perimeters the landing zone enforces. The narrower of the two keys the
 * policy accepts; the broader one is deliberately not used and not named here.
 *
 * Case is significant — the policy condition matches this exactly.
 */
export const PERIMETER_EXEMPTION_TAG = { key: 'LZA:EXC:NET', value: 'true' } as const;

/**
 * Resource name prefix the landing zone's deny-Lambda-outside-a-VPC statement
 * excepts by `NotResource`. **Load-bearing**: rename the functions and the
 * deploy is denied. Kept here next to the tag because both are the same kind of
 * fact — a coupling to policy this repo does not own.
 */
export const CHAT_FUNCTION_PREFIX = 'cv-chat-';
