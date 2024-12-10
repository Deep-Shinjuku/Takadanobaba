// DOM Elements
const menuButton = document.querySelector('[aria-label="Toggle Navigation Menu"]');
const dropdownMenu = document.getElementById('dropdown-menu');
const upArrow = document.querySelector('#dpdm-left button:first-child'); // Top navigation arrow
const downArrow = document.querySelector('#dpdm-left button:last-child'); // Bottom navigation arrow
const articles = document.querySelectorAll('.article-item');
const hoverTriggers = document.querySelectorAll('[data-hover-trigger]');
const yearDisplay = document.querySelector('.font-dotgothic16:nth-child(2)');
const monthDisplay = document.querySelector('.font-dotgothic16:nth-child(3)');

// State Variables
let currentYear = 2024;
let currentMonth = 1;
let currentArticleSet = 1; // 1 for articles 1-4, 2 for article 5

// Constants
const ARTICLE_SPACING = 168;

// Function: Toggle Dropdown Menu
function toggleNavMenu() {
  dropdownMenu.classList.toggle('active');
  dropdownMenu.classList.toggle('hidden');
}

// Function: Update Article Positions
function updateArticlePositions(showingArticle5) {
  articles.forEach((article) => {
    const articleNumber = parseInt(article.dataset.article, 10);

    if (showingArticle5) {
      if (articleNumber === 1) {
        article.style.top = `-${ARTICLE_SPACING}px`;
        article.style.opacity = '0';
        article.style.pointerEvents = 'none';
      } else if (articleNumber === 5) {
        article.style.top = `${504}px`;
        article.classList.remove('hidden');
        requestAnimationFrame(() => {
          article.style.opacity = '1';
          article.style.pointerEvents = 'auto';
        });
      } else {
        const newPosition = (articleNumber - 2) * ARTICLE_SPACING;
        article.style.top = `${newPosition}px`;
      }
    } else {
      if (articleNumber === 1) {
        article.style.top = '0';
        article.style.opacity = '1';
        article.style.pointerEvents = 'auto';
      } else if (articleNumber === 5) {
        article.style.opacity = '0';
        article.style.pointerEvents = 'none';
        setTimeout(() => article.classList.add('hidden'), 300);
      } else {
        const newPosition = (articleNumber - 1) * ARTICLE_SPACING;
        article.style.top = `${newPosition}px`;
      }
    }
  });
}

// Function: Update Month Display
function updateMonthDisplay() {
  if (yearDisplay && monthDisplay) {
    yearDisplay.textContent = `${currentYear}年`;
    monthDisplay.textContent = `${currentMonth}月号`;
  }
}

// Event: Menu Button Click
menuButton?.addEventListener('click', toggleNavMenu);

// Event: Navigate Months with Arrows
upArrow?.addEventListener('click', () => {
  if (currentMonth === 1) {
    currentMonth = 12;
    currentYear--;
  } else {
    currentMonth--;
  }
  updateMonthDisplay();
});

downArrow?.addEventListener('click', () => {
  if (currentMonth === 12) {
    currentMonth = 1;
    currentYear++;
  } else {
    currentMonth++;
  }
  updateMonthDisplay();
});

// Event: Hover Effects for Background
hoverTriggers.forEach(trigger => {
  trigger.addEventListener('mouseenter', () => {
    const articleId = trigger.dataset.hoverTrigger;
    articles.forEach(bg => bg.classList.remove('active'));
    document.querySelector(`[data-article="${articleId}"]`)?.classList.add('active');
  });
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  updateArticlePositions(false);
  updateMonthDisplay();
});
