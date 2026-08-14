// JS logic for the preview can be added here
document.addEventListener('DOMContentLoaded', () => {
    fetch('brief.md')
        .then(response => response.text())
        .then(text => {
            // A simple markdown parser could go here. For the artifact, we will just display the raw text or use a standard renderer library if needed.
            // To ensure immediate rendering without external dependencies for this demo, let's map key parts dynamically:
            const previewDiv = document.querySelector('.preview-wrapper');
            content = `
                <h1>Project Brief: Harbor AI</h1>

                ## 1. Executive Summary
                **Harbor AI** is a venture-backed tech startup building an intelligent data navigation platform for enterprise logistics. Our mission is to transform raw operational data into "safe harbor" insights, reducing decision latency by leveraging generative AI. We bridge the gap between complex supply chain systems and actionable business intelligence.

                ## 2. Core Features
                Below is a table of our Minimum Viable Product (MVP) deliverables:

                | Feature Category | Description | Priority |
                | :--- | :--- | :--- |
                | **Data Ingestion** | Real-time API connectors for ERP and WMS systems. | High |
                | **Predictive Dashboard** | AI-driven visualizations identifying shipping bottlenecks. | High |
                | **Smart Alerts** | Automated Slack/Email notifications for anomalies. | Medium |
                | **Voice Synthesis** | Text-to-speech summaries for on-floor warehouse workers. | Low |

                ## 3. Development Timeline
                The project will follow a strict Agile methodology over the next 6 months:

                *   **Phase 1 (Month 1-2):** Requirement gathering, architecture design, and core data modeling.
                *   **Phase 2 (Month 3-4):** MVP development, focusing on Data Ingestion and Predictive Dashboards.
                *   **Phase 3 (Month 5):** Internal Alpha testing with select pilot clients; fixing bugs based on feedback.
                *   **Phase 4 (Month 6):** Public Beta Launch and go-to-market strategy execution.

                ## 4. Launch Checklist
                To ensure a successful market entry, we must complete:

                [x] Finalize seed funding pitch deck
                [ ] Complete alpha testing with pilot partners
                [ ] Draft Terms of Service and Privacy Policy
                [ ] Set up automated cloud infrastructure (AWS/Azure)
                [ ] Create marketing landing page
                [ ] Schedule press release distribution

                ## 5. Conclusion
                Harbor AI aims to become the standard for logistics intelligence. By focusing on data clarity and actionable insights, we empower logistics managers to navigate uncertainty with confidence.
            `;
            previewDiv.innerHTML = content;
        })
        .catch(err => console.error('Error loading markdown:', err));
});