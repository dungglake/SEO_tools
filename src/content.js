import Countable from 'countable';

let highlightedElement = null;
let currentDuplicateIndex = -1;
const duplicateLinks = [];

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
    // Edit mode: Count words in the content area excluding "rank-math-faq"
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

    console.log("Other content word count (edit mode):", otherContentWordCount);
    console.log("FAQ word count (edit mode):", faqWordCount);

    totalWordCount = faqWordCount + otherContentWordCount;

  } else {
    // View mode: Count words in the content area excluding "rank-math-faq"
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

      console.log("Other content word count (view mode):", otherContentWordCount);
      console.log("FAQ word count (view mode):", faqWordCount);

      totalWordCount = faqWordCount + otherContentWordCount;

    } else {
      Countable.count(contentArea.innerText, (counter) => {
        totalWordCount = counter.words;
      });
    }
  }

  // Print the concatenated words to the console
  console.log("Total word count:", totalWordCount);

  // Display word count in create/edit mode
  if (url.endsWith("/post-new.php") || url.includes("action=edit")) {
    const wordCountElement = document.getElementById('word-count');
    if (wordCountElement) {
      wordCountElement.textContent = `${totalWordCount} words`;
    }
  }

  console.log("Counted words:", totalWordCount);

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
    return document.querySelector('.wp-block-post-content');
  } else {
    return document.querySelector('#vnx_post_content');
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

  const images = Array.from(contentArea.querySelectorAll('img')).map(img => {
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
  console.log("Highlighting anchor:", anchorText);
  if (highlightedElement) {
    highlightedElement.style.backgroundColor = '';
    highlightedElement = null;
  }

  const elements = document.querySelectorAll('a, span, div, p, h1, h2, h3, h4, h5, h6');
  elements.forEach(el => {
    if (el.textContent.trim() === anchorText.trim()) {
      el.style.backgroundColor = 'lightyellow';
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      highlightedElement = el;
    }
  });
}

function findNextDuplicate() {
  console.log("Finding next duplicate link");
  if (duplicateLinks.length === 0) return;

  if (highlightedElement) {
    highlightedElement.style.backgroundColor = '';
    highlightedElement = null;
  }

  currentDuplicateIndex++;
  if (currentDuplicateIndex >= duplicateLinks.length) {
    currentDuplicateIndex = 0;
  }

  const nextDuplicate = duplicateLinks[currentDuplicateIndex];
  nextDuplicate.style.backgroundColor = 'lightyellow';
  nextDuplicate.scrollIntoView({ behavior: 'smooth', block: 'center' });
  highlightedElement = nextDuplicate;
}

function scrollToAnchor(anchorText) {
  const elements = document.querySelectorAll('a, span, div, p, h1, h2, h3, h4, h5, h6');
  elements.forEach(el => {
    if (el.textContent.trim() === anchorText.trim()) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}

function scrollToImage(imageUrl) {
  const images = document.querySelectorAll('img');
  images.forEach(img => {
    if (img.src === imageUrl || img.getAttribute('data-src') === imageUrl) {
      img.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Received request:", request);

  try {
    if (request.action === 'getContentOverview' || request.action === 'getContentOverviewFromCreate' || request.action === 'getContentOverviewFromEdit') {
      const result = getContentOverview();
      sendResponse(result);
    } else if (request.action === 'getImagesAndLinks') {
      const result = getImagesAndLinks();
      sendResponse(result);
    } else if (request.action === 'highlightAnchor') {
      highlightAnchor(request.anchorText);
    } else if (request.action === 'scrollToAnchor') {
      scrollToAnchor(request.anchorText);
    } else if (request.action === 'scrollToImage') {
      scrollToImage(request.imageUrl);
    } else if (request.action === 'findNextDuplicate') {
      findNextDuplicate(request.anchorText);
    } else {
      sendResponse({ error: "Unknown action" });
    }
  } catch (error) {
    console.error("Error handling request:", error);
    sendResponse({ error: error.message });
  }

  // Indicate that the response is asynchronous
  return true;
});
