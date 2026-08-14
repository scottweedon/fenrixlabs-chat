const colorBtn = document.getElementById('color-btn');
const helloText = document.getElementById('hello-text');

// Array of sample colors for the heading
const colors = [
    '#e74c3c', // Red
    '#2ecc71', // Green
    '#3498db', // Blue
    '#f1c40f', // Yellow
    '#9b59b6', // Purple
    '#d35400', // Orange
    '#1abc9c'  // Teal
];

let colorIndex = 0;

colorBtn.addEventListener('click', () => {
    helloText.style.color = colors[colorIndex];
    
    // Increment and wrap around array
    colorIndex = (colorIndex + 1) % colors.length;
});