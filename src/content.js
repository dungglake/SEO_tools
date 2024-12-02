import Countable from 'countable';

let highlightedElement = null;
const duplicateLinks = [];

// Inject CSS for highlighting
function injectHighlightCSS() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = chrome.runtime.getURL('css/highlight.css');
  document.head.appendChild(link);
}
injectHighlightCSS();

// Fetch content overview
function getContentOverview() {
  console.log("Fetching content overview...");

  const metaTitleElement = document.querySelector('.edit-post-visual-editor__post-title-wrapper');
  const metaTitle = metaTitleElement ? metaTitleElement.innerText : document.querySelector('title') ? document.querySelector('title').innerText : '';
  const metaTitleCount = metaTitle.length;

  const metaDescription = document.querySelector('meta[name="description"]') ? document.querySelector('meta[name="description"]').getAttribute('content') : '';
  const metaDescriptionCount = metaDescription.length;

  const thumbnail = document.querySelector('meta[property="og:image"]') ? document.querySelector('meta[property="og:image"]').getAttribute('content') : '';
  console.log("Thumbnail URL:", thumbnail);

  const thumbnailAlt = document.querySelector('meta[property="og:image:alt"]') ? document.querySelector('meta[property="og:image:alt"]').getAttribute('content') : '';
  console.log("Thumbnail Alt:", thumbnailAlt);

  const contentArea = getContentArea();
  if (!contentArea) {
    console.error("Content area not found.");
    return {};
  }

  const url = window.location.href;
  let totalWordCount = 0;

  if (url.endsWith("/post-new.php") || url.includes("action=edit")) {
    const faq = contentArea.querySelector('#rank-math-faq');
    let faqWordCount = 0;

    if (faq) {
      const faqQuestions = Array.from(faq.getElementsByClassName('rank-math-faq-question'));
      const faqAnswers = Array.from(faq.getElementsByClassName('rank-math-faq-answer'));
      const faqText = [...faqQuestions, ...faqAnswers].map(el => el.innerText).join(' ');

      Countable.count(faqText, (counter) => {
        faqWordCount = counter.words;
      });
    }

    const otherContentElements = Array.from(contentArea.children).filter(el => !el.contains(faq));
    const otherContentText = otherContentElements.map(el => el.innerText).join(' ');

    let otherContentWordCount = 0;
    Countable.count(otherContentText, (counter) => {
      otherContentWordCount = counter.words;
    });

    totalWordCount = faqWordCount + otherContentWordCount;

  } else {
    const faq = contentArea.querySelector('#rank-math-faq');
    let faqWordCount = 0;

    if (faq) {
      const faqQuestions = Array.from(faq.getElementsByClassName('ftwp-heading'));
      const faqAnswers = Array.from(faq.getElementsByClassName('rank-math-answer'));
      const faqText = [...faqQuestions, ...faqAnswers].map(el => el.innerText).join(' ');

      Countable.count(faqText, (counter) => {
        faqWordCount = counter.words;
      });

      const otherContentText = contentArea.innerText.replace(faq.innerText, '');

      let otherContentWordCount = 0;
      Countable.count(otherContentText, (counter) => {
        otherContentWordCount = counter.words;
      });

      totalWordCount = faqWordCount + otherContentWordCount;

    } else {
      Countable.count(contentArea.innerText, (counter) => {
        totalWordCount = counter.words;
      });
    }
  }

  if (url.endsWith("/post-new.php") || url.includes("action=edit")) {
    const wordCountElement = document.getElementById('word-count');
    if (wordCountElement) {
      wordCountElement.textContent = `${totalWordCount} words`;
    }
  }

  return {
    metaTitle,
    metaDescription,
    metaTitleCount,
    metaDescriptionCount,
    thumbnail,
    thumbnailAlt,
    wordCount: `${totalWordCount} words`
  };
}

// Get content area based on URL
function getContentArea() {
  const url = window.location.href;

  if (url.endsWith("/post-new.php") || url.includes("action=edit")) {
    return document.querySelector('.wp-block-post-content');
  } else {
    return document.querySelector('#vnx_post_content');
  }
}

// Check link status for 404 or 403 errors
async function checkLinkStatus(url) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'include'
    });

    const is_404 = response.status === 404;
    const is_403 = response.status === 403;

    return { is_404, is_403 };
  } catch (error) {
    console.error(`Lỗi khi kiểm tra trạng thái link cho ${url}:`, error);
    return { is_404: false, is_403: false };
  }
}

// Get images and links with error checks
async function getImagesAndLinks(sendResponse) {
  console.log("Fetching images and links...");

  let total4xxUrls = 0;

  const contentArea = getContentArea();
  if (!contentArea) {
    console.error("Content area not found.");
    sendResponse({ images: [], links: [], error: "Content area not found." });
    return;
  }

  let imageIdCounter = 1;
  let linkIdCounter = 1;

  const imageFormatsCount = {};
  let totalImagesWithAlt = 0;
  let totalImagesWithoutAlt = 0;
  let totalImagesWithTitle = 0;
  let totalImagesWithoutTitle = 0;
  let totalImagesWithCaption = 0;
  let totalImagesWithoutCaption = 0;

  const images = Array.from(contentArea.querySelectorAll('img')).filter(img => {
    const format = img.src.split('.').pop().toLowerCase();
    return format !== 'svg';
  }).map(img => {
    const figure = img.closest('figure');
    const caption = figure ? figure.querySelector('figcaption') : null;

    const url = img.getAttribute('data-src') || img.src || '';
    const name = url.substring(url.lastIndexOf('/') + 1);
    const format = url.split('.').pop();

    if (format) {
      imageFormatsCount[format] = (imageFormatsCount[format] || 0) + 1;
    }

    if (img.alt) {
      totalImagesWithAlt++;
    } else {
      totalImagesWithoutAlt++;
    }

    if (img.title) {
      totalImagesWithTitle++;
    } else {
      totalImagesWithoutTitle++;
    }

    if (caption) {
      totalImagesWithCaption++;
    } else {
      totalImagesWithoutCaption++;
    }

    return {
      id: imageIdCounter++,
      alt_text: img.alt || '',
      url: url,
      name: name,
      format: format,
      caption: caption ? caption.textContent : ''
    };
  });

  const links = await Promise.all(Array.from(contentArea.querySelectorAll('a')).map(async (link) => {
    const is_duplicated = Array.from(contentArea.querySelectorAll('a')).filter(l => l.href === link.href).length > 1;
    if (is_duplicated) {
      duplicateLinks.push(link);
    }

    const status = await checkLinkStatus(link.href); 

    if (status.is_404 || status.is_403) {
      total4xxUrls++; 
    }

    return {
      link_id: linkIdCounter++,
      anchor: link.textContent || '',
      url: link.href || '',
      is_external: link.hostname !== location.hostname,
      is_nofollow: link.rel.includes('nofollow'),
      is_new_tab: link.target === '_blank',
      is_duplicated: is_duplicated,
      is_404: status.is_404,
      is_403: status.is_403
    };
  }));

  const totalUrls = links.length;
  const totalDuplicatedUrls = links.length - new Set(links.map(link => link.url)).size;
  const totalNewTabUrls = links.filter(link => link.is_new_tab).length;
  const totalInternalLinks = links.filter(link => !link.is_external).length;
  const totalExternalLinks = links.filter(link => link.is_external).length;
  const totalNoFollowUrls = links.filter(link => link.is_nofollow).length;

  sendResponse({
    images,
    links,
    overview: {
      totalImages: images.length,
      imageFormatsCount,
      totalImagesWithAlt,
      totalImagesWithoutAlt,
      totalImagesWithTitle,
      totalImagesWithoutTitle,
      totalImagesWithCaption,
      totalImagesWithoutCaption,
      totalUrls,
      totalDuplicatedUrls,
      totalNewTabUrls,
      totalInternalLinks,
      totalExternalLinks,
      totalNoFollowUrls,
      total4xxUrls
    }
  });
}

// Highlight specific anchor text
function highlightAnchor(anchorText) {
  if (highlightedElement) {
    highlightedElement.classList.remove('highlighted');
    highlightedElement = null;
  }

  const contentArea = getContentArea();
  if (!contentArea) {
    console.error("Content area not found.");
    return;
  }

  const elements = contentArea.querySelectorAll('a, span, div, p, h1, h2, h3, h4, h5, h6');

  elements.forEach(el => {
    if (el.textContent.trim() === anchorText.trim()) {
      el.classList.add('highlighted');
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      highlightedElement = el;
    }
  });
}

// Reset all highlights
function resetHighlights() {
  const highlightedElements = document.querySelectorAll('.highlighted');
  highlightedElements.forEach(el => {
    el.classList.remove('highlighted');
  });

  highlightedElement = null;
  duplicateLinks.length = 0;
}

// Highlight all duplicate links
function highlightAllDuplicates() {
  duplicateLinks.forEach(link => {
    link.classList.add('highlighted');
  });

  if (duplicateLinks.length > 0) {
    setTimeout(() => {
      duplicateLinks[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }
}

function scrollToAnchor(anchorText) {
  const elements = document.querySelectorAll('a, span, div, p, h1, h2, h3, h4');
  elements.forEach(el => {
    if (el.textContent.trim() === anchorText.trim()) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  });
}

function scrollToImage(imageUrl) {
  const images = document.querySelectorAll('img');
  images.forEach(img => {
    if (img.src === imageUrl || img.getAttribute('data-src') === imageUrl) {
      setTimeout(() => {
        img.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  });
}

function extractHeadings() {
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4')).map(heading => ({
    type: heading.tagName,
    content: heading.textContent.trim(),
    position: heading.getBoundingClientRect().top + window.pageYOffset
  }));
  return headings;
}

function scrollToPosition(position) {
  const offset = 100;
  window.scrollTo({ top: position - offset, behavior: 'smooth' });
}

// Chrome runtime listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.action === 'getContentOverview' || request.action === 'getContentOverviewFromCreate' || request.action === 'getContentOverviewFromEdit') {
      const result = getContentOverview();
      sendResponse(result);
    } else if (request.action === 'getImagesAndLinks') {
      getImagesAndLinks(sendResponse).then(result => {
        sendResponse(result);
      }).catch(error => {
        sendResponse({ error: error.message });
      });
    } else if (request.action === 'highlightAnchor') {
      highlightAnchor(request.anchorText);
      sendResponse({ status: 'done' });
    } else if (request.action === 'scrollToAnchor') {
      scrollToAnchor(request.anchorText);
      sendResponse({ status: 'done' });
    } else if (request.action === 'scrollToImage') {
      scrollToImage(request.imageUrl);
      sendResponse({ status: 'done' });
    } else if (request.action === 'highlightAllDuplicates') {
      highlightAllDuplicates();
      sendResponse({ status: 'done' });
    } else if (request.action === 'resetHighlights') {
      resetHighlights();
      sendResponse({ status: 'done' });
    } else if (request.action === 'getHeadings') {
      const headings = extractHeadings();
      sendResponse(headings);
    } else if (request.action === 'scrollToPosition') {
      scrollToPosition(request.position);
      sendResponse({ status: 'done' });
    } else {
      sendResponse({ error: "Unknown action" });
    }
  } catch (error) {
    console.error("Error handling request:", error);
    sendResponse({ error: error.message });
  }

  return true;
});
