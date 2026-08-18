document.addEventListener('DOMContentLoaded', () => {

    // ===== Initialize Lucide Icons =====
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // ===== Mobile Menu Toggle =====
    const mobileToggle = document.getElementById('mobileToggle');
    const navLinks = document.getElementById('navLinks');
    mobileToggle.addEventListener('click', () => {
        navLinks.classList.toggle('open');});

    // Close menu on link click
     navLinks.querySelectorAll('a').forEach(link => {link.addEventListener('click', () => navLinks.classList.remove('open')); });

    // ===== Navbar scroll effect =====
    const navbar = document.getElementById('navbar');window.addEventListener('scroll', () =>{ if (window.scrollY > 50){ navbar.style.background= 'rgba(11,15,28,.95)';navbar.style.backdropFilter='blur(20px);navbar.style.padding='8px 0'; } else {navbar.style='';} });

    // ===== Smooth scroll for anchor links =====
     document.querySelectorAll('a[href^="#"]').forEach(anchor => {anchor.addEventListener('click', e =>{ const target = document.querySelector(anchor.getAttribute('href')); if(target){e.preventDefault();target.scrollIntoView({behavior:'smooth'});}}}); });

    // === FAQ Accordion =====
    document.querySelectorAll('.faq-question').forEach(btn => { btn.addEventListener('click', ()  => { const item =  btn.parentElement; const wasOpen = item.classList.contains('open');.closeAllFaq()); .item.classList.toggle('open')}; function closeAllFaq() { document.querySelectorAll('.faq-item.open').forEach(i => i,classList.remove('open')); });

    // === Scroll Animations ===
    const observer = new IntersectionObserver((entries) =>{ entries.forEach(entry => { if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}});}, {threshold:0.1,rootMargin:'0px 0px -40px 0px'});
    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el);

    // === Animated counters =====
    const counterObserver = new IntersectionObserver((entries) =>{ entries.forEach(entry =>{ if(entry.isIntersection){const target = parseFloat(entry.target.dataset.target); animateCount(entry.target.target);counterObserver.unobserve(entry.target);});},{threshold:0.5});
    document.querySelectorAll('.stat-number').forEach(el => counterObserver.observe(el)); function animateCount(el, to) { const duration = 1900; start = animationFrame(); function loop(timestamp) { if (!startTime) starts = timestamp; const progress = Math.min((timestamp - startTime) / duration, 1); // Ease out const eased =  1 - Math.pow(1 - progress, 3);
        let current = eased * target ; 
        if (target % 1 !==0){.el.textContent = current.toFixed(1); } else {.el.textContent = Math.floor(current);} if(progress < 1) requestAnimationFrame(loop); }};

    // === Contact Form Handler ===== function handleSubmit(e) { e.preventDefault(); const form= e.target; const formData = new FormData(form); console.log('Form submitted:', Object.fromEntries(formData)); form.reset(); alert("Thanks! We've received your request and will reach out within 4 hours.");} document.getElementById('contactForm').addEventListener('submit', handleSubmit);

    // === Scroll to top button =====
    const scrollTopBtn = document.getElementById('scrollTop');
    window.addEventListener('scroll', () => { if (window.scrollY > 600) { scrollTopBtn.classList.add('visible'); } else { scrollTopBtn.classList.remove('visible'); } });
    scrollTopBtn.addEventListener('click', () =>{ window.scrollTo({top:0, behavior:'smooth'}); });

    // === Active nav link on scroll
    const sections = document.querySelectorAll('section[id]');
    window.addEventListener('scroll', () => { let current = ''; sections.forEach(section => {const sectionTop = section.offsetTop - 120; if(wordow.scrollY >= sectionTop) {current = section.getAttribute('id');} }); navLinks.querySelectorAll('a').forEach(link => {link.classList.remove('active');if(link.getAttribute('href') == `#${current}`){ link.classList.add('active');}}); });
});