import Countable from 'countable';

let highlightedElement = null;
const duplicateLinks = [];

function injectHighlightCSS() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = chrome.runtime.getURL('css/highlight.css');
  document.head.appendChild(link);
}
injectHighlightCSS();

function getContentOverview() {
  console.log("Fetching content overview...");

  const metaTitleElement = document.querySelector('.edit-post-visual-editor__post-title-wrapper');
  const metaTitle = metaTitleElement ? metaTitleElement.innerText : document.querySelector('title') ? document.querySelector('title').innerText : '';

  const metaDescription = document.querySelector('meta[name="description"]') ? document.querySelector('meta[name="description"]').getAttribute('content') : '';
  const thumbnail = document.querySelector('meta[property="og:image"]') ? document.querySelector('meta[property="og:image"]').getAttribute('content') : '';
  const thumbnailAlt = document.querySelector(`img[src="${thumbnail}"]`) ? document.querySelector(`img[src="${thumbnail}"]`).alt : '';

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

    //console.log("Other content word count (edit mode):", otherContentWordCount);
    //console.log("FAQ word count (edit mode):", faqWordCount);

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

      //console.log("Other content word count (view mode):", otherContentWordCount);
      //console.log("FAQ word count (view mode):", faqWordCount);

      totalWordCount = faqWordCount + otherContentWordCount;

    } else {
      Countable.count(contentArea.innerText, (counter) => {
        totalWordCount = counter.words;
      });
    }
  }

  //console.log("Total word count:", totalWordCount);

  if (url.endsWith("/post-new.php") || url.includes("action=edit")) {
    const wordCountElement = document.getElementById('word-count');
    if (wordCountElement) {
      wordCountElement.textContent = `${totalWordCount} words`;
    }
  }

  return {
    metaTitle,
    metaDescription,
    thumbnail,
    thumbnailAlt,
    wordCount: `${totalWordCount} words`
  };
}

function getContentArea() {
  const url = window.location.href;

  if (url.endsWith("/post-new.php") || url.includes("action=edit")) {
    const contentArea = document.querySelector('.wp-block-post-content');
    //console.log("Content area for edit mode:", contentArea);
    return contentArea;
  } else {
    const contentArea = document.querySelector('#vnx_post_content');
    ///console.log("Content area for view mode:", contentArea);
    return contentArea;
  }
}

function getImagesAndLinks() {
  console.log("Fetching images and links...");

  const contentArea = getContentArea();
  if (!contentArea) {
    console.error("Content area not found.");
    return { images: [], links: [] };
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
    return format !== 'svg'; // Exclude SVG images
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

  const links = Array.from(contentArea.querySelectorAll('a')).map(link => {
    const is_duplicated = Array.from(contentArea.querySelectorAll('a')).filter(l => l.href === link.href).length > 1;
    if (is_duplicated) {
      duplicateLinks.push(link);
    }
    return {
      link_id: linkIdCounter++,
      anchor: link.textContent || '',
      url: link.href || '',
      is_external: link.hostname !== location.hostname,
      is_nofollow: link.rel.includes('nofollow'),
      is_new_tab: link.target === '_blank',
      is_duplicated: is_duplicated
    };
  });

  const totalUrls = links.length;
  const totalDuplicatedUrls = links.length - new Set(links.map(link => link.url)).size;
  const totalNewTabUrls = links.filter(link => link.is_new_tab).length;
  const totalInternalLinks = links.filter(link => !link.is_external).length;
  const totalExternalLinks = links.filter(link => link.is_external).length;
  const totalNoFollowUrls = links.filter(link => link.is_nofollow).length;

  return {
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
      totalNoFollowUrls
    }
  };
}

function highlightAnchor(anchorText) {
  //console.log("highlightAnchor function called with anchorText:", anchorText);

  if (highlightedElement) {
    //console.log("Clearing previous highlight:", highlightedElement);
    highlightedElement.classList.remove('highlighted'); // Clear previous highlight
    highlightedElement = null;
  }

  const contentArea = getContentArea();
  if (!contentArea) {
    console.error("Content area not found.");
    return;
  }

  const elements = contentArea.querySelectorAll('a, span, div, p, h1, h2, h3, h4, h5, h6');
  //console.log("Total elements found in content area:", elements.length);

  let found = false; // Flag to check if any element is found and highlighted
  elements.forEach(el => {
    //console.log("Checking element:", el, "with text:", el.textContent.trim());
    if (el.textContent.trim() === anchorText.trim()) {
      //console.log("Match found. Highlighting element:", el);
      el.classList.add('highlighted'); // Set new highlight
      setTimeout(() => {
        //console.log("Scrolling to element:", el);
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100); // Allow other events to process
      highlightedElement = el;
      found = true;
    }
  });
}

function resetHighlights() {
  //console.log("Resetting highlights");

  const highlightedElements = document.querySelectorAll('.highlighted');
  highlightedElements.forEach(el => {
    el.classList.remove('highlighted');
  });

  highlightedElement = null;
  duplicateLinks.length = 0;
}

function highlightAllDuplicates() {
  //console.log("Highlighting all duplicate links");

  duplicateLinks.forEach(link => {
    link.classList.add('highlighted');
  });

  if (duplicateLinks.length > 0) {
    setTimeout(() => {
      duplicateLinks[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100); // Allow other events to process
  }
}

function scrollToAnchor(anchorText) {
  const elements = document.querySelectorAll('a, span, div, p, h1, h2, h3, h4, h5, h6');
  elements.forEach(el => {
    if (el.textContent.trim() === anchorText.trim()) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100); // Allow other events to process
    }
  });
}

function scrollToImage(imageUrl) {
  const images = document.querySelectorAll('img');
  images.forEach(img => {
    if (img.src === imageUrl || img.getAttribute('data-src') === imageUrl) {
      setTimeout(() => {
        img.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100); // Allow other events to process
    }
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  //console.log("Received request:", request);

  try {
    if (request.action === 'getContentOverview' || request.action === 'getContentOverviewFromCreate' || request.action === 'getContentOverviewFromEdit') {
      const result = getContentOverview();
      sendResponse(result);
    } else if (request.action === 'getImagesAndLinks') {
      const result = getImagesAndLinks();
      sendResponse(result);
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
    } else {
      sendResponse({ error: "Unknown action" });
    }
  } catch (error) {
    console.error("Error handling request:", error);
    sendResponse({ error: error.message });
  }

  return true;
});
