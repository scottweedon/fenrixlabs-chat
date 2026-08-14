document.getElementById('color-btn').addEventListener('click', function() {
    const heading = document.getElementById('main-heading');
    
    // Generate a random hex color
    const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16);
    
    // Apply the new color to the heading
    heading.style.color = randomColor;
    heading.innerText = "Hello World!";
});