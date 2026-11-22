"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import Image from "next/image";
import { ArrowDown, ArrowRight, ArrowUpRight, Menu, X, Sparkles, Linkedin, Mail, Plus, Minus } from "lucide-react";
import { assistantAnswers, certifications, education, experience, profile, projects, skillGroups, specialties } from "@/data/portfolio";
import { Reveal } from "@/components/reveal";
import { InteractiveCanvasAnimation } from "@/components/interactive-canvas-animation";

const navItems = ["About", "Expertise", "Projects", "Experience", "Contact"];
const revealVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.56, ease: [0.22, 1, 0.36, 1] } },
};
const staggerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.04 } },
};

export default function Portfolio() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openProject, setOpenProject] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [activeSection, setActiveSection] = useState("home");
  const reduceMotion = Boolean(useReducedMotion());

  useEffect(() => {
    const sections = navItems
      .map((item) => document.getElementById(item.toLowerCase()))
      .filter((section): section is HTMLElement => section !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        const current = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (current) setActiveSection(current.target.id);
      },
      { rootMargin: "-28% 0px -58% 0px", threshold: [0, 0.15, 0.35, 0.6] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="#home" aria-label="Kuldeep Thakur home">KULDEEP THAKUR<span>.</span></a>
        <nav className="desktop-nav" aria-label="Main navigation">
          {navItems.map((item) => {
            const section = item.toLowerCase();
            return <a key={item} href={`#${section}`} aria-current={activeSection === section ? "location" : undefined}>{item}</a>;
          })}
        </nav>
        <a className="nav-cta" href={`mailto:${profile.email}`}>Let’s connect <ArrowUpRight size={15} /></a>
        <button className="menu-toggle" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>

      <AnimatePresence>
        {menuOpen && <motion.nav className="mobile-nav" initial={reduceMotion ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: reduceMotion ? 0 : 0.2 }} aria-label="Mobile navigation">
          {navItems.map((item) => {
            const section = item.toLowerCase();
            return <a key={item} href={`#${section}`} aria-current={activeSection === section ? "location" : undefined} onClick={() => setMenuOpen(false)}>{item}<ArrowUpRight size={16} /></a>;
          })}
        </motion.nav>}
      </AnimatePresence>

      <section className="hero" id="home">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-copy">
          <motion.div className="eyebrow" initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : .55, delay: reduceMotion ? 0 : .1 }}>
            <span className="status-dot" /> APPLIED AI <span className="eyebrow-line" /> PRODUCT ENGINEERING
          </motion.div>
          <h1 className="hero-title">
            <span className="hero-line-mask"><motion.span className="hero-line" initial={reduceMotion ? false : { y: "108%" }} animate={{ y: 0 }} transition={{ duration: reduceMotion ? 0 : .72, delay: reduceMotion ? 0 : .18, ease: [.22, 1, .36, 1] }}>Engineering</motion.span></span>
            <span className="hero-line-mask"><motion.span className="hero-line hero-line-accent" initial={reduceMotion ? false : { y: "108%" }} animate={{ y: 0 }} transition={{ duration: reduceMotion ? 0 : .72, delay: reduceMotion ? 0 : .29, ease: [.22, 1, .36, 1] }}>Intelligence.</motion.span></span>
            <span className="hero-line-mask"><motion.span className="hero-line" initial={reduceMotion ? false : { y: "108%" }} animate={{ y: 0 }} transition={{ duration: reduceMotion ? 0 : .72, delay: reduceMotion ? 0 : .4, ease: [.22, 1, .36, 1] }}>Creating What’s Next.</motion.span></span>
          </h1>
          <motion.div className="hero-bottom" initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : .58, delay: reduceMotion ? 0 : .48, ease: [.22, 1, .36, 1] }}>
            <div>
              <motion.p className="hero-role" initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : .42, delay: reduceMotion ? 0 : .52 }}>AI Engineer &amp; Software Developer</motion.p>
              <motion.p className="hero-description" initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : .42, delay: reduceMotion ? 0 : .62 }}>Building intelligent applications and AI-powered software for real-world problems.</motion.p>
              <div className="hero-actions"><motion.a className="button button-dark" href="#projects" initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : .42, delay: reduceMotion ? 0 : .72 }} whileHover={reduceMotion ? undefined : { y: -3 }} whileTap={reduceMotion ? undefined : { scale: .98 }}>Explore my work <ArrowRight size={16} /></motion.a><motion.a className="text-link" href={`mailto:${profile.email}`} initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : .42, delay: reduceMotion ? 0 : .81 }} whileHover={reduceMotion ? undefined : { x: 3 }}>Let’s talk <ArrowUpRight size={16} /></motion.a></div>
            </div>
            <motion.div className="hero-art" aria-label="Abstract connected intelligence network" animate={reduceMotion ? undefined : { y: [0, -7, 0] }} transition={reduceMotion ? undefined : { duration: 8, repeat: Infinity, ease: "easeInOut" }}>
              <div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" />
              <span className="node node-core"><Sparkles size={20} /></span><span className="node node-a" /><span className="node node-b" /><span className="node node-c" /><span className="node node-d" />
              <span className="art-label label-ai">APPLIED AI</span><span className="art-label label-systems">INTELLIGENT SYSTEMS</span>
            </motion.div>
          </motion.div>
        </div>
        <a className="scroll-cue" href="#about"><span>SCROLL TO EXPLORE</span><ArrowDown size={14} /></a>
        <div className="hero-index">01 / 05</div>
      </section>

      <section className="intro-strip" aria-label="Professional focus">
        <span className="strip-label">FOCUS</span>{specialties.map((item) => <span className="focus-pill" key={item}>{item}</span>)}
      </section>

      <section className="section about-section" id="about">
        <Reveal className="section-kicker"><span>01 — ABOUT</span><span>THE ENGINEERING MINDSET</span></Reveal>
        <Reveal className="about-layout" delay={.06}>
          <h2>Curiosity sees<br />the possibility.<br /><em>Engineering</em><br /><em>makes it real.</em></h2>
          <div className="about-text"><p className="lead">{profile.intro}</p><p>I’m building my path in applied AI engineering through hands-on software development and practical AI application work. I care about the full journey: understanding a problem, designing a useful system and making the pieces work together.</p><a className="inline-link" href="#expertise">Explore my expertise <ArrowRight size={16} /></a></div>
        </Reveal>
        <Reveal className="about-note" delay={.1}><span className="note-mark">“</span><p>Building Intelligent Systems.<br /><strong>Engineering Real-World Solutions.</strong></p><span className="note-caption">KULDEEP THAKUR · ENGINEERING PRINCIPLE</span></Reveal>
      </section>

      <section className="section expertise-section" id="expertise">
        <Reveal className="section-kicker"><span>02 — EXPERTISE</span><span>TOOLS IN SERVICE OF THE PROBLEM</span></Reveal>
        <Reveal className="section-heading-row" delay={.04}><h2>Systems thinking.<br /><em>Practical building.</em></h2><p>Technology is a toolkit. I bring these areas together to turn ideas into useful, working software.</p></Reveal>
        <motion.div className="skills-grid" variants={staggerVariants} initial={reduceMotion ? false : "hidden"} whileInView={reduceMotion ? undefined : "visible"} viewport={{ once: true, amount: .16 }}>
          {skillGroups.map((group, index) => <motion.article className="skill-card" key={group.label} variants={reduceMotion ? undefined : revealVariants} whileHover={reduceMotion ? undefined : { y: -5, borderColor: "rgba(255, 0, 85, .72)" }} transition={{ duration: reduceMotion ? 0 : .5, ease: [.22, 1, .36, 1] }}>
            <span className="card-index">{String(index + 1).padStart(2, "0")}</span><h3>{group.label}</h3><div className="skill-list">{group.items.map((item) => <span key={item}>{item}</span>)}</div>
          </motion.article>)}
        </motion.div>
        <InteractiveCanvasAnimation />
      </section>

      <section className="projects-section" id="projects">
        <div className="section section-projects">
          <Reveal className="section-kicker"><span>03 — SELECTED WORK</span><span>IDEAS, SYSTEMS, IMPLEMENTATION</span></Reveal>
          <Reveal className="section-heading-row" delay={.04}><h2>Building for<br /><em>what matters.</em></h2><p>A selection of software and AI concepts shaped around useful, real-world workflows.</p></Reveal>
          <div className="project-list">{projects.map((project, index) => <motion.article className="project-card" key={project.number} layout={!reduceMotion} initial={reduceMotion ? false : { opacity: 0, y: 26 }} whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, amount: .12 }} transition={{ duration: reduceMotion ? 0 : .58, delay: reduceMotion ? 0 : (index % 2) * .08, ease: [.22, 1, .36, 1] }} whileHover={reduceMotion ? undefined : { y: -3 }}>
            <motion.div className={`project-visual visual-${project.visual}`} aria-hidden={project.visual !== "clinic" && project.visual !== "agrobot"} whileHover={reduceMotion ? undefined : { scale: 1.025 }} transition={{ duration: reduceMotion ? 0 : .55, ease: [.22, 1, .36, 1] }}>
              {project.visual === "clinic" ? <><Image className="project-photo" src="/projects/clinicqueue-assistant.png" alt="ClinicQueue Assistant chat showing a doctor appointment booking flow on a phone" fill sizes="(max-width: 650px) 90vw, 42vw" /><div className="visual-caption">CLINICQUEUE · APPOINTMENT FLOW</div></> : project.visual === "agrobot" ? <><Image className="project-photo" src="/projects/agrobot.png" alt="A small agricultural robot prototype with sensors and wheels" fill sizes="(max-width: 650px) 90vw, 42vw" /><div className="visual-caption">AGROBOT · FIELD PROTOTYPE</div></> : project.visual === "voice" ? <><div className="voice-orbit"><span /><span /><span /><span /><b>VOICE<br />AI</b></div><div className="voice-lines"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div><div className="visual-caption">SPEECH → INTELLIGENCE → VOICE</div></> : <><div className="abstract-mark">{project.visual === "plant" ? "PL" : project.visual === "storage" ? "CS" : "M"}<span>✳</span></div><div className="visual-caption">{project.type.toUpperCase()}</div></>}
            </motion.div>
            <div className="project-info"><div className="project-meta"><span>{project.number} / PROJECT</span><span>{project.type}</span></div><h3>{project.name}</h3><p>{project.description}</p><div className="project-tags">{project.stack.map((tag) => <span key={tag}>{tag}</span>)}</div>
              <button className="case-button" aria-expanded={openProject === project.number} onClick={() => setOpenProject(openProject === project.number ? null : project.number)}>{openProject === project.number ? "Close case study" : "Explore case study"}{openProject === project.number ? <Minus size={16} /> : <Plus size={16} />}</button>
              <AnimatePresence>{openProject === project.number && <motion.div className="project-details" initial={reduceMotion ? false : { height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reduceMotion ? 0 : .32, ease: [.22, 1, .36, 1] }}><p>{project.details}</p><span className="detail-label">DESIGN INTENT</span><p>Describe the problem clearly, connect the system components thoughtfully and keep the experience useful for the people who rely on it.</p></motion.div>}</AnimatePresence>
            </div>
          </motion.article>)}</div>
          <Reveal className="project-footnote">Project descriptions reflect current portfolio information. No unverified metrics or demo links are shown.</Reveal>
        </div>
      </section>

      <section className="section journey-section" id="experience">
        <Reveal className="section-kicker"><span>04 — EXPERIENCE & LEARNING</span><span>GROWING THROUGH PRACTICE</span></Reveal>
        <Reveal className="section-heading-row" delay={.04}><h2>Learning by<br /><em>building together.</em></h2><p>Professional experience and a strong computer science foundation inform how I approach engineering work.</p></Reveal>
        <motion.div className="journey-grid" variants={staggerVariants} initial={reduceMotion ? false : "hidden"} whileInView={reduceMotion ? undefined : "visible"} viewport={{ once: true, amount: .14 }}>
          <motion.article className="journey-card experience-card" variants={reduceMotion ? undefined : revealVariants} whileHover={reduceMotion ? undefined : { y: -4 }}>
            <span className="timeline-marker" aria-hidden="true" /><span className="card-index">PROFESSIONAL EXPERIENCE</span><div className="journey-date">{experience.dates}</div><h3>{experience.role}</h3><p className="journey-company">{experience.company}<span> · </span>{experience.location}</p><p>{experience.summary}</p>
          </motion.article>
          <motion.article className="journey-card education-card" variants={reduceMotion ? undefined : revealVariants} whileHover={reduceMotion ? undefined : { y: -4 }}>
            <span className="timeline-marker" aria-hidden="true" /><span className="card-index">EDUCATION</span><div className="journey-date">{education.dates}</div><h3>{education.degree}</h3><p className="journey-company">{education.school}<span> · </span>{education.result}</p><div className="certifications"><span className="card-index">CERTIFICATIONS</span>{certifications.map((item) => <p key={item}>{item}</p>)}</div>
          </motion.article>
        </motion.div>
      </section>

      <section className="philosophy-section"><div className="section philosophy-inner"><Reveal className="section-kicker"><span>05 — HOW I THINK</span><span>BEYOND WRITING CODE</span></Reveal><Reveal className="philosophy-title" delay={.04}><h2>Good engineering<br />starts with <em>good questions.</em></h2></Reveal><motion.div className="principles" variants={staggerVariants} initial={reduceMotion ? false : "hidden"} whileInView={reduceMotion ? undefined : "visible"} viewport={{ once: true, amount: .2 }}><motion.div variants={reduceMotion ? undefined : revealVariants}><span>01</span><h3>Understand<br />the problem.</h3><p>Start with context, constraints and the people at the center of the work.</p></motion.div><motion.div variants={reduceMotion ? undefined : revealVariants}><span>02</span><h3>Build<br />with purpose.</h3><p>Choose clear, maintainable solutions that earn their complexity.</p></motion.div><motion.div variants={reduceMotion ? undefined : revealVariants}><span>03</span><h3>Keep<br />exploring.</h3><p>Stay curious, learn from each iteration and make the next version better.</p></motion.div></motion.div></div></section>

      <section className="assistant-section" id="assistant"><Reveal className="assistant-card"><div><span className="assistant-kicker"><Sparkles size={15} /> LOCAL PORTFOLIO GUIDE</span><h2>Ask about my<br /><em>engineering journey.</em></h2><p>A small, local Q&A demo using portfolio information. It doesn’t connect to a live AI model.</p></div><div className="assistant-controls"><label htmlFor="portfolio-question">Choose a question</label><select id="portfolio-question" value={answer ? Object.keys(assistantAnswers).find((question) => assistantAnswers[question] === answer) ?? "" : ""} onChange={(event) => setAnswer(assistantAnswers[event.target.value] ?? "")}><option value="">Select a question…</option>{Object.keys(assistantAnswers).map((question) => <option key={question}>{question}</option>)}</select><AnimatePresence mode="wait">{answer && <motion.p className="assistant-answer" initial={reduceMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: reduceMotion ? 0 : .2 }} key={answer}>{answer}</motion.p>}</AnimatePresence></div></Reveal></section>

      <footer className="footer" id="contact"><div className="section footer-inner"><Reveal className="section-kicker"><span>06 — CONTACT</span><span>OPEN TO MEANINGFUL PROBLEMS</span></Reveal><Reveal className="footer-pitch" delay={.05}><p className="footer-pretitle">HAVE AN INTERESTING PROBLEM TO SOLVE?</p><h2>Let’s build<br /><em>what’s next.</em></h2><motion.a className="button button-light" href={`mailto:${profile.email}`} whileHover={reduceMotion ? undefined : { y: -3 }} whileTap={reduceMotion ? undefined : { scale: .98 }}>Start a conversation <ArrowUpRight size={17} /></motion.a></Reveal><div className="footer-bottom"><a className="wordmark footer-wordmark" href="#home">KT<span>.</span></a><span>AI Engineer &amp; Software Developer</span><div className="social-links"><a href={`mailto:${profile.email}`} aria-label="Email Kuldeep"><Mail size={18} /></a><a href={profile.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn profile"><Linkedin size={18} /></a></div><span>© {new Date().getFullYear()} KULDEEP THAKUR</span></div></div></footer>
    </main>
  );
}
