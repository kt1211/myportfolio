import "server-only";

import { createHash } from "node:crypto";
import { assistantAnswers, certifications, education, experience, profile, projects, skillGroups, specialties } from "@/data/portfolio";

export type KnowledgeDocument = {
  sourceKey: string;
  title: string;
  sourceName: string;
  text: string;
  metadata: Record<string, unknown>;
};

export function cleanText(value: string) {
  return value.normalize("NFKC").replace(/\u0000/g, "").replace(/[\t\f\v ]+/g, " ").replace(/\r\n?/g, "\n").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function chunkText(input: string, maxChars = 3600, overlap = 450) {
  const text = cleanText(input);
  if (!text) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);
    if (end < text.length) {
      const boundary = Math.max(text.lastIndexOf("\n", end), text.lastIndexOf(". ", end), text.lastIndexOf(" ", end));
      if (boundary > start + maxChars * 0.62) end = boundary + (text[boundary] === "." ? 1 : 0);
    }
    const part = text.slice(start, end).trim();
    if (part) chunks.push(part);
    if (end >= text.length) break;
    start = Math.max(start + 1, end - overlap);
  }
  return chunks;
}

export function contentHash(content: string) {
  return createHash("sha256").update(content).digest("hex");
}

export function portfolioKnowledge(): KnowledgeDocument[] {
  return [
    { sourceKey: "portfolio:profile", title: `${profile.name} — Profile`, sourceName: "src/data/portfolio.ts · profile", text: `${profile.name}\nProfessional identity: ${profile.role}\n${profile.intro}`, metadata: { source_type: "portfolio", category: "profile" } },
    { sourceKey: "portfolio:specialties", title: "Professional specializations", sourceName: "src/data/portfolio.ts · specialties", text: `Professional specializations: ${specialties.join(", ")}.`, metadata: { source_type: "portfolio", category: "specialties" } },
    ...skillGroups.map((group, index) => ({ sourceKey: `portfolio:skills:${index}`, title: `${group.label} skills`, sourceName: "src/data/portfolio.ts · skillGroups", text: `${group.label}: ${group.items.join(", ")}.`, metadata: { source_type: "portfolio", category: "skills", group: group.label } })),
    ...projects.map((project) => ({ sourceKey: `portfolio:project:${project.number}`, title: project.name, sourceName: `src/data/portfolio.ts · project ${project.number}`, text: `${project.name}\nType: ${project.type}\nDescription: ${project.description}\nTechnical case study: ${project.details}\nTechnologies and concepts: ${project.stack.join(", ")}. Treat descriptions as the portfolio's stated scope; do not add results that are not listed.`, metadata: { source_type: "portfolio", category: "project", project_number: project.number, project_name: project.name, project_type: project.type, technologies: project.stack, visual: project.visual } })),
    { sourceKey: "portfolio:experience", title: `${experience.role} at ${experience.company}`, sourceName: "src/data/portfolio.ts · experience", text: `Professional experience: ${experience.role} at ${experience.company}. Location: ${experience.location}. Dates: ${experience.dates}. ${experience.summary}`, metadata: { source_type: "portfolio", category: "experience", company: experience.company, dates: experience.dates } },
    { sourceKey: "portfolio:education", title: education.degree, sourceName: "src/data/portfolio.ts · education", text: `Education: ${education.degree}, ${education.school}. Dates: ${education.dates}. Result: ${education.result}.`, metadata: { source_type: "portfolio", category: "education", institution: education.school, dates: education.dates } },
    { sourceKey: "portfolio:certifications", title: "Certifications", sourceName: "src/data/portfolio.ts · certifications", text: `Certifications: ${certifications.join("; ")}.`, metadata: { source_type: "portfolio", category: "certifications" } },
    ...Object.entries(assistantAnswers).map(([question, answer], index) => ({ sourceKey: `portfolio:answer:${index}`, title: question, sourceName: "src/data/portfolio.ts · assistantAnswers", text: `Portfolio FAQ: ${question}\n${answer}`, metadata: { source_type: "portfolio", category: "faq" } })),
    { sourceKey: "portfolio:case-study-notes", title: "Project scope and engineering principles", sourceName: "Portfolio project and about sections", text: "Portfolio project scope is intentionally described without unverified outcome claims. Project descriptions discuss concepts and implementation areas as presented, and must not be represented as production outcomes unless specifically stated. Engineering principles: understand the problem and its constraints; build maintainable solutions with purpose; keep learning through iteration. The portfolio introduces Kuldeep as an emerging AI Engineer with practical software development and AI application-building exposure.", metadata: { source_type: "portfolio", category: "case_study_guidance" } },
  ];
}
