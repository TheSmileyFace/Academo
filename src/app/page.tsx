"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Users,
  CalendarDays,
  ClipboardCheck,
  BarChart3,
  MessageCircle,
  Shield,
  Zap,
  GraduationCap,
  School,
  ChevronRight,
  CheckCircle2,
  Star,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const features = [
  { icon: ClipboardCheck, title: "Assignment Management", description: "Create, distribute, and track assignments across classes. Students submit digitally, teachers grade efficiently." },
  { icon: CalendarDays, title: "Smart Timetables", description: "Interactive schedules that handle substitutions, room changes, and notify everyone instantly." },
  { icon: Users, title: "Attendance Tracking", description: "Quick attendance logging with analytics. Flag patterns and keep parents informed automatically." },
  { icon: MessageCircle, title: "Parent Portal", description: "Real-time visibility into grades, attendance, and assignments. Secure messaging with teachers." },
  { icon: BarChart3, title: "Performance Analytics", description: "Track student progress over time. Identify at-risk students early and enable timely intervention." },
  { icon: Shield, title: "GDPR Compliant", description: "Enterprise-grade security with role-based access control, data encryption, and full GDPR compliance." },
];

const steps = [
  { step: "01", title: "Book a Demo", description: "Schedule a personalised walkthrough with our team. We'll understand your school's needs." },
  { step: "02", title: "We Set You Up", description: "Our team configures your school environment, imports data, and trains your staff." },
  { step: "03", title: "Invite Everyone", description: "Generate invite codes for teachers, students, and parents. Everyone joins securely." },
  { step: "04", title: "Go Live", description: "Your school is running. Manage assignments, grades, attendance, and communication in one place." },
];

const pricing = [
  {
    name: "Starter",
    price: "Free",
    period: "for 30 days",
    description: "Perfect for schools wanting to explore Academo.",
    features: ["Up to 100 students", "5 teacher accounts", "Assignment management", "Basic timetables", "Email support"],
    cta: "Start Free Trial",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "\u00A33",
    period: "per student / month",
    description: "Everything you need to run a modern school.",
    features: ["Unlimited students", "Unlimited teachers", "Parent portal access", "Performance analytics", "AI-powered tools", "Priority support", "Custom branding"],
    cta: "Book a Demo",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "tailored pricing",
    description: "For multi-academy trusts and large institutions.",
    features: ["Everything in Professional", "Multi-school management", "Dedicated account manager", "API access & integrations", "SLA guarantee", "On-site training", "Data migration support"],
    cta: "Contact Sales",
    highlighted: false,
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: "easeOut" as const },
  }),
};

export default function Home() {
  const [contactForm, setContactForm] = useState({
    first_name: "",
    last_name: "",
    institution_name: "",
    email: "",
    student_count: "",
    requirements: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from("contact_requests").insert(contactForm);
    if (error) {
      toast.error("Failed to submit. Please try again.");
    } else {
      setSubmitted(true);
      toast.success("Request submitted successfully. We will be in touch.");
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen landing-bg text-white">

      {/* ========== NAVBAR ========== */}
      <nav className="fixed top-4 left-1/2 z-50 -translate-x-1/2 w-[calc(100%-2rem)] max-w-5xl">
        <div className="glass-nav rounded-2xl px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white font-bold text-sm">A</div>
            <span className="text-base font-bold tracking-tight text-white">Academo</span>
          </Link>
          <div className="hidden items-center gap-7 md:flex">
            <a href="#features" className="text-sm text-white/60 hover:text-white transition-colors">Features</a>
            <a href="#for-schools" className="text-sm text-white/60 hover:text-white transition-colors">For Schools</a>
            <a href="#pricing" className="text-sm text-white/60 hover:text-white transition-colors">Pricing</a>
            <a href="#about" className="text-sm text-white/60 hover:text-white transition-colors">About</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:block text-sm text-white/70 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="#contact">
              <button className="bg-white text-[#0a0a0b] text-sm font-semibold px-5 py-2 rounded-xl hover:bg-white/90 transition-colors">
                Book a Demo
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ========== HERO ========== */}
      <section className="relative pt-32 pb-24 lg:pt-44 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 landing-warm-glow" />
        <div className="relative mx-auto max-w-7xl px-6">
          <motion.div className="text-center max-w-4xl mx-auto" initial="hidden" animate="visible">
            <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 mb-8">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-medium text-white/70">The future of school management is here</span>
              <ChevronRight className="h-3 w-3 text-white/40" />
            </motion.div>

            <motion.h1 variants={fadeUp} custom={1} className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-7xl lg:leading-[1.05]">
              The smarter way to{" "}
              <span className="bg-gradient-to-r from-amber-200 via-amber-100 to-white bg-clip-text text-transparent">run your school</span>
            </motion.h1>

            <motion.p variants={fadeUp} custom={2} className="mx-auto mt-6 max-w-2xl text-lg text-white/50 leading-relaxed">
              A unified platform for administrators, teachers, students, and parents. Manage assignments, grades, timetables, and communication in one beautiful place.
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="#contact">
                <button className="flex items-center gap-2 bg-white text-[#0a0a0b] font-semibold px-8 py-3.5 rounded-xl hover:bg-white/90 transition-colors text-sm">
                  Book a Demo
                  <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
              <Link href="#how-it-works">
                <button className="flex items-center gap-2 border border-white/15 text-white/80 font-medium px-8 py-3.5 rounded-xl hover:bg-white/5 transition-colors text-sm">
                  <Play className="h-4 w-4" />
                  Watch Demo
                </button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Dashboard Preview */}
          <motion.div
            className="mt-16 max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
          >
            <div className="glass-card rounded-2xl p-1">
              <div className="rounded-xl bg-[#111113] p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center text-white text-sm font-bold">A</div>
                    <span className="text-sm font-semibold text-white/80">Academo Dashboard</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-white/5" />
                    <div className="w-7 h-7 rounded-full bg-white/5" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-white/5 p-4 text-center">
                    <div className="text-2xl font-bold text-amber-200">248</div>
                    <div className="text-[11px] text-white/40 mt-1">Students</div>
                  </div>
                  <div className="rounded-xl bg-white/5 p-4 text-center">
                    <div className="text-2xl font-bold text-amber-200">18</div>
                    <div className="text-[11px] text-white/40 mt-1">Teachers</div>
                  </div>
                  <div className="rounded-xl bg-white/5 p-4 text-center">
                    <div className="text-2xl font-bold text-amber-200">12</div>
                    <div className="text-[11px] text-white/40 mt-1">Classes</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {["Mathematics - Year 10A", "English - Year 11B", "Science - Year 9C"].map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-lg border border-white/5 px-4 py-3">
                      <div className="w-2 h-2 rounded-full bg-amber-400/60" />
                      <span className="text-sm text-white/70 font-medium">{item}</span>
                      <span className="ml-auto text-xs text-white/30">Active</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ========== SOCIAL PROOF ========== */}
      <section className="py-12 border-y border-white/5">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-center text-xs font-medium uppercase tracking-widest text-white/25 mb-8">Trusted by schools across the UK</p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
            {["St. Patrick's Academy", "Greenfield Secondary", "Oakwood Grammar", "Riverside College", "Maple Leaf School"].map((name) => (
              <span key={name} className="text-sm font-medium text-white/20">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ========== FEATURES ========== */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400/80 mb-3">Features</p>
            <h2 className="text-3xl font-bold sm:text-4xl">Everything your school needs</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-white/50">
              Built for real school needs. From assignments to analytics, we have you covered.
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                className="glass-card glass-card-hover rounded-2xl p-6 transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 mb-4">
                  <feature.icon className="h-5 w-5 text-amber-300/70" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-white/40">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== FOR SCHOOLS / STUDENTS / PARENTS ========== */}
      <section id="for-schools" className="py-24 relative">
        <div className="absolute inset-0 landing-warm-glow-bottom pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400/80 mb-3">For Everyone</p>
            <h2 className="text-3xl font-bold sm:text-4xl">One platform, every perspective</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-white/50">
              Every role gets a tailored experience designed for their daily workflows.
            </p>
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-3">
            {[
              {
                icon: School,
                title: "For Schools & Admins",
                description: "Full control over your school's structure. Manage year groups, classes, timetables, staff, announcements, and compliance from one central dashboard.",
                items: ["School-wide analytics", "Staff & student management", "Invite code system", "GDPR compliance tools"],
              },
              {
                icon: GraduationCap,
                title: "For Students",
                description: "A clean, focused space to manage schoolwork. View assignments, submit work, track grades, and stay on top of your timetable.",
                items: ["Assignment tracker", "Grade overview", "AI study assistant", "Timetable & calendar"],
              },
              {
                icon: Users,
                title: "For Parents",
                description: "Real-time visibility into your child's education. Monitor grades, assignments, and communicate directly with teachers.",
                items: ["Child progress tracking", "Grade & attendance reports", "Teacher messaging", "School announcements"],
              },
            ].map((role, i) => (
              <motion.div
                key={role.title}
                className="glass-card glass-card-hover rounded-2xl p-8 transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 mb-5">
                  <role.icon className="h-6 w-6 text-amber-300/70" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{role.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed mb-5">{role.description}</p>
                <ul className="space-y-2.5">
                  {role.items.map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-white/60">
                      <CheckCircle2 className="h-4 w-4 text-amber-400/50 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section id="how-it-works" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400/80 mb-3">How It Works</p>
            <h2 className="text-3xl font-bold sm:text-4xl">Get started in four steps</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-white/50">
              A professional onboarding process designed for institutions.
            </p>
          </motion.div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <div className="text-4xl font-bold text-white/8 mb-4">{s.step}</div>
                <h3 className="text-base font-bold text-white mb-2">{s.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{s.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== PRICING ========== */}
      <section id="pricing" className="py-24 relative">
        <div className="absolute inset-0 landing-warm-glow pointer-events-none opacity-50" />
        <div className="relative mx-auto max-w-7xl px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400/80 mb-3">Pricing</p>
            <h2 className="text-3xl font-bold sm:text-4xl">Simple, transparent pricing</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-white/50">
              No hidden fees. Start with a free trial, upgrade when you are ready.
            </p>
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-3 max-w-5xl mx-auto">
            {pricing.map((plan, i) => (
              <motion.div
                key={plan.name}
                className={`rounded-2xl p-8 transition-all duration-300 ${
                  plan.highlighted
                    ? "bg-white/[0.06] border border-amber-400/20 ring-1 ring-amber-400/10"
                    : "glass-card glass-card-hover"
                }`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                {plan.highlighted && (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-3 py-1 mb-4">
                    <Star className="h-3 w-3 text-amber-400" />
                    <span className="text-xs font-semibold text-amber-300">Most Popular</span>
                  </div>
                )}
                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                <p className="text-sm text-white/40 mt-1 mb-5">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-sm text-white/40 ml-2">{plan.period}</span>
                </div>
                <Link href="#contact">
                  <button className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
                    plan.highlighted
                      ? "bg-white text-[#0a0a0b] hover:bg-white/90"
                      : "border border-white/10 text-white/80 hover:bg-white/5"
                  }`}>
                    {plan.cta}
                  </button>
                </Link>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-white/50">
                      <CheckCircle2 className="h-4 w-4 text-amber-400/40 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== ABOUT ========== */}
      <section id="about" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="lg:flex lg:items-center lg:gap-16">
            <motion.div
              className="lg:w-1/2 mb-12 lg:mb-0"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-400/80 mb-3">About Academo</p>
              <h2 className="text-3xl font-bold sm:text-4xl mb-6">Built by educators, for educators</h2>
              <p className="text-base text-white/50 leading-relaxed mb-6">
                Academo was born from a simple observation: schools deserve better technology. We&apos;re a team of educators and engineers who believe that managing a school should be as intuitive as using your favourite app.
              </p>
              <p className="text-base text-white/50 leading-relaxed">
                Our mission is to give every school &mdash; regardless of size or budget &mdash; access to professional-grade management tools that save time, improve outcomes, and keep everyone connected.
              </p>
            </motion.div>
            <motion.div
              className="lg:w-1/2 grid grid-cols-2 gap-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {[
                { value: "50+", label: "Schools onboarded" },
                { value: "12,000+", label: "Students active" },
                { value: "99.9%", label: "Uptime SLA" },
                { value: "4.9/5", label: "Customer rating" },
              ].map((stat) => (
                <div key={stat.label} className="glass-card rounded-2xl p-6 text-center">
                  <div className="text-2xl font-bold text-amber-200">{stat.value}</div>
                  <div className="text-xs text-white/40 mt-1">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ========== CONTACT / BOOK A DEMO ========== */}
      <section id="contact" className="py-24 relative">
        <div className="absolute inset-0 landing-warm-glow-bottom pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-6 lg:flex lg:gap-16 items-start">
          <motion.div
            className="lg:w-1/2 mb-12 lg:mb-0"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400/80 mb-3">Get Started</p>
            <h2 className="text-3xl font-bold sm:text-4xl mb-4">
              Ready to transform your school?
            </h2>
            <p className="text-base text-white/50 mb-8 leading-relaxed">
              Book a personalised demo with our team. We&apos;ll show you how Academo can work for your institution and prepare a custom quote.
            </p>
            <div className="space-y-4 text-sm">
              {[
                "Dedicated onboarding and data migration",
                "Role-based access with enterprise security",
                "GDPR compliant data handling",
                "Priority support and training",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-amber-400/50 shrink-0" />
                  <span className="text-white/50">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="lg:w-1/2"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {submitted ? (
              <div className="glass-card rounded-2xl p-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-amber-400/70 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Thank you for your interest</h3>
                <p className="text-white/50">Our team will review your request and get back to you within 1-2 business days.</p>
              </div>
            ) : (
              <div className="glass-card rounded-2xl p-8">
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-white/60">First Name</label>
                      <Input
                        required
                        placeholder="Jane"
                        value={contactForm.first_name}
                        onChange={(e) => setContactForm({ ...contactForm, first_name: e.target.value })}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl focus:border-amber-400/30"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-white/60">Last Name</label>
                      <Input
                        required
                        placeholder="Doe"
                        value={contactForm.last_name}
                        onChange={(e) => setContactForm({ ...contactForm, last_name: e.target.value })}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl focus:border-amber-400/30"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-white/60">Institution Name</label>
                    <Input
                      required
                      placeholder="St. Patrick's Academy"
                      value={contactForm.institution_name}
                      onChange={(e) => setContactForm({ ...contactForm, institution_name: e.target.value })}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl focus:border-amber-400/30"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-white/60">Work Email</label>
                    <Input
                      required
                      type="email"
                      placeholder="jane@school.edu"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl focus:border-amber-400/30"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-white/60">Estimated Student Count</label>
                    <select
                      value={contactForm.student_count}
                      onChange={(e) => setContactForm({ ...contactForm, student_count: e.target.value })}
                      className="flex h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                    >
                      <option className="bg-[#1a1a1a] text-white" value="">Select range...</option>
                      <option className="bg-[#1a1a1a] text-white" value="1-500">1 - 500</option>
                      <option className="bg-[#1a1a1a] text-white" value="501-2000">501 - 2,000</option>
                      <option className="bg-[#1a1a1a] text-white" value="2000+">2,000+</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-white/60">Additional Requirements</label>
                    <Textarea
                      placeholder="Tell us about your current systems and needs..."
                      value={contactForm.requirements}
                      onChange={(e) => setContactForm({ ...contactForm, requirements: e.target.value })}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl min-h-[80px] focus:border-amber-400/30"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-11 bg-white text-[#0a0a0b] hover:bg-white/90 font-semibold rounded-xl text-sm transition-colors disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Request Quote & Demo"}
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="py-6 px-6">
        <div className="mx-auto max-w-7xl glass-footer rounded-2xl px-8 py-12">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white font-bold text-sm">A</div>
                <span className="text-base font-bold tracking-tight text-white">Academo</span>
              </div>
              <p className="text-xs text-white/30 leading-relaxed">&copy; 2026 Academo.<br />All rights reserved.</p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2.5">
                {["Features", "Pricing", "Integrations", "Changelog"].map((item) => (
                  <li key={item}>
                    <a href="#features" className="text-sm text-white/40 hover:text-white/70 transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* For Users */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">For Users</h4>
              <ul className="space-y-2.5">
                {["Schools", "Students", "Parents", "Teachers"].map((item) => (
                  <li key={item}>
                    <a href="#for-schools" className="text-sm text-white/40 hover:text-white/70 transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2.5">
                {["About", "Careers", "Partners", "Blog"].map((item) => (
                  <li key={item}>
                    <a href="#about" className="text-sm text-white/40 hover:text-white/70 transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Support</h4>
              <ul className="space-y-2.5">
                {["Help Centre", "Contact", "Privacy Policy", "Terms of Service"].map((item) => (
                  <li key={item}>
                    <a href="#contact" className="text-sm text-white/40 hover:text-white/70 transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
