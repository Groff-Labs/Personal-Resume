import Hero from "@/components/Hero";
import AboutMe from "@/components/AboutMe";
import Skills from "@/components/Skills";
import Experience from "@/components/Experience";
import Testimonials from "@/components/Testimonials";
import Education from "@/components/Education";
import Certifications from "@/components/Certifications";
import ProjectShowcase from "@/components/ProjectShowcase";

export default function Home() {
  return (
    <>
      <Hero />
      <AboutMe />
      <Skills />
      <Experience />
      <Testimonials />
      <Education />
      <Certifications />
      <ProjectShowcase />
    </>
  );
}
