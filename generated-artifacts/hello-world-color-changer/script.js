const colors = [
    '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71',
    '#1abc9c', '#3498db', '#6c5ce7', '#9b59b6',
    '#e84393', '#fd79a8', '#00cec9', '#0984e3'
];

let currentIndex = 0;

const heading = document.getElementById('heading');
const button = document.getElementById('colorBtn');

button.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % colors.length;
    heading.style.color = colors[currentIndex];
});