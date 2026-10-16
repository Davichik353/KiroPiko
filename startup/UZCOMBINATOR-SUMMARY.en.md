# KiroPiko — application summary

Draft prepared on 16 October 2026. The application form requires sign-in, so these are reusable answers, not a completed or submitted application.

**One sentence.** KiroPiko is a compact Windows AI companion with an Android app that helps developers monitor AI agents, review requests and chat with connected models.

**Problem.** Developers using AI agents must switch between editors, terminals and chat windows. An unanswered permission request or question can leave a task waiting when the developer steps away from the computer. Our hypothesis is that a shared desktop panel and phone interface reduce waiting time and context switching.

**Product.** A small top-of-screen capsule shows agent status and pending requests. A QR-paired Android companion provides access to the information and actions explicitly enabled on the computer. Actions are not approved automatically. The Kiro character, wardrobe and Russian localization make the product recognizable; agent oversight is the primary use case.

**Current stage.** A working Windows prototype and Android debug preview exist. The Android app has been launched in an emulator and paired with Windows. Local build and automated checks pass. A full acceptance test on clean Windows, physical Android devices, multiple monitors and every external integration has not been completed. There is no verified traction, revenue or funding claim in this draft.

**Technical foundation.** KiroPiko is based on the open-source Coucou project. Upstream attribution and licenses are retained. KiroPiko-specific work includes its character and branding, Windows diagnostics and music features, history and quiet mode, Android Russian localization, wardrobe alignment, a dedicated Groq provider, and fixes for file-drop and reconnection flows. The entire inherited codebase must not be described as original work written from scratch.

**Initial customer hypothesis.** Independent developers and small teams using AI coding agents on Windows.

**Pilot.** Recruit 5–10 developers, measure time to the first useful action, QR pairing success, missed agent requests and repeat use, and interview them about willingness to pay. These are targets, not existing customer counts. Collect telemetry only with consent, or start with manual observation.

**Business model hypothesis.** A free basic product and a paid tier for advanced workflows and team features. Users can bring their own model keys. Pricing, billing and subscriptions are not implemented or validated.

**Next priorities.** A screenshot-to-explanation-to-confirmed-plan workflow; reliable delivery and an audit trail for phone requests; one-screen connection diagnostics. Automatic execution of fixes is future work and must require explicit confirmation. Broader browser music, plugins and camera access follow demand validation.

**Founder information to add.** Full name, city, team and roles; verified users and interviews; actual revenue and funding status; incorporation details if requested; the specific help sought from UzCombinator. Do not invent missing information.

**Suggested demo.** Show the Windows capsule, agent status, connected Android, a previously verified safe request flow, and a short chat using an available model. Avoid exposing personal projects, keys or messages. Do not demonstrate unverified mail delivery or promise automatic repairs.
