export const profile = {
  name: "Kuldeep Thakur",
  role: "AI Engineer | Software Developer",
  email: "kuldeepthakur48388@gmail.com",
  linkedin: "https://www.linkedin.com/in/kuldeepthakur1211/",
  intro:
    "I build intelligent applications and AI-powered software solutions by combining artificial intelligence, modern software engineering and automation. My interests span LLM applications, agentic workflows, conversational AI and full-stack development.",
};

export const specialties = [
  "Applied AI Engineering",
  "LLM Applications",
  "Agentic AI",
  "Intelligent Automation",
];

export const skillGroups = [
  { label: "Applied AI", items: ["Python", "LLM applications", "RAG", "Agentic workflows", "OCR", "Whisper", "Ollama", "AI automation"] },
  { label: "Backend & systems", items: ["C#", ".NET", "FastAPI", "REST APIs", "Entity Framework Core", "SQL", "Redis"] },
  { label: "Product engineering", items: ["React", "TypeScript", "JavaScript", "Tailwind CSS", "SignalR", "HTML & CSS"] },
  { label: "Data & tools", items: ["Pandas", "NumPy", "Power BI", "Git", "GitHub", "SQLite", "Figma"] },
];

export const projects = [
  {
    number: "01",
    name: "ClinicCure",
    type: "AI-powered healthcare automation",
    description: "A connected patient experience for appointment workflows, designed to bring conversational automation and clinic operations into one system.",
    details: "The product concept combines a messaging-led booking flow with appointment changes, symptom-based routing, reminders, multilingual communication and document intake. A real-time operations view helps clinic teams follow the queue.",
    stack: [".NET", "C#", "React", "FastAPI", "SignalR", "SQLite", "Redis", "Ollama"],
    visual: "clinic",
  },
  {
    number: "02",
    name: "AI Voicebot",
    type: "Conversational voice automation",
    description: "A voice interaction system exploring the path from spoken input to AI-assisted response and natural audio output.",
    details: "The architecture explores streaming speech recognition, conversational orchestration and speech synthesis, with attention to low-latency transport and clear boundaries between audio processing and application logic.",
    stack: ["Python", "FastAPI", "Whisper", "Ollama", "WebRTC / RTP"],
    visual: "voice",
  },
  {
    number: "03",
    name: "MediBook",
    type: "Healthcare application",
    description: "A focused digital booking experience that makes it easier to coordinate appointments and access care.",
    details: "MediBook is part of a broader interest in practical software that reduces friction in everyday workflows. The portfolio intentionally avoids unverified outcome claims.",
    stack: ["Application development", "Healthcare workflows"],
    visual: "medibook",
  },
  {
    number: "04",
    name: "Agrobot",
    type: "Connected systems",
    description: "An exploration of technology for water management and agriculture in a village context.",
    details: "This project brings together an interest in automation, sensing and practical systems that respond to local needs.",
    stack: ["Automation", "IoT concepts", "Agriculture"],
    visual: "agrobot",
  },
  {
    number: "05",
    name: "Arduino Smart Plant Watering",
    type: "Embedded automation",
    description: "A connected system concept that uses sensing and automation to support more consistent plant care.",
    details: "This project explores a direct feedback loop between environmental input and a simple physical action, making an everyday task easier to monitor and automate.",
    stack: ["Arduino", "Sensors", "Automation"],
    visual: "plant",
  },
 
];

export const experience = {
  role: "Software Development Intern — AI Studio",
  company: "Technossus Software Solutions Pvt. Ltd.",
  location: "Pune, India",
  dates: "5 January 2026 — 18 June 2026",
  summary: "Professional exposure to software development, engineering workflows, technical problem-solving and collaborative delivery in an AI-focused environment.",
};

export const education = {
  degree: "B.Tech, Computer Science and Engineering",
  school: "Avantika University",
  dates: "2022 — 2026",
  result: "CGPA 7.98",
};

export const certifications = [
  "Advanced Statistics for Machine Learning — Infosys",
  "Foundations of Data Science — Infosys",
  "Foundations of Artificial Intelligence — IBM",
];

export const assistantAnswers: Record<string, string> = {
  "What does Kuldeep build?": "AI-powered applications and software solutions, with a focus on LLM applications, agentic workflows, conversational AI and automation.",
  "Tell me about the healthcare project": "ClinicCure explores appointment automation, patient messaging, document intake and clinic operations in one connected experience.",
  "What technologies does he work with?": "The portfolio highlights Python, LLM tooling, C#/.NET, FastAPI, React, TypeScript, SQL, Redis and related application engineering tools.",
};
