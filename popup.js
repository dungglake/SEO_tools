console.log("popup.js is loaded");

document.addEventListener('DOMContentLoaded', () => {
  console.log("DOMContentLoaded event fired");
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  const messageElement = document.getElementById('message');
  const tabContainer = document.getElementById('tab-container');
  const toggleImageViewButton = document.getElementById('toggle-image-view');
  const imageViewContainer = document.getElementById('image-view-container');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(tc => tc.classList.remove('active'));

      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');

      // Scroll to the top of the tab content
      document.getElementById(tab.dataset.tab).scrollTop = 0;
    });
  });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTabUrl = tabs[0].url;
    console.log('Current Tab URL:', currentTabUrl);
    if (currentTabUrl.includes('vietnix.vn')) {
      messageElement.style.display = 'none';
      tabContainer.style.display = 'block';

      let action;
      if (currentTabUrl.includes('wp-admin/post-new.php')) {
        action = 'getContentOverviewFromCreate';
      } else if (currentTabUrl.includes('wp-admin/post.php') && currentTabUrl.includes('&action=edit')) {
        action = 'getContentOverviewFromEdit';
      } else {
        action = 'getContentOverview';
      }

      chrome.tabs.sendMessage(tabs[0].id, { action }, (overviewResponse) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
          return;
        }
        if (overviewResponse && !overviewResponse.error) {
          console.log('Overview Response:', overviewResponse);
          displayOverview(overviewResponse, action);
        } else {
          console.error('Error in content overview response:', overviewResponse ? overviewResponse.error : 'No response');
        }
      });

      chrome.tabs.sendMessage(tabs[0].id, { action: 'getImagesAndLinks' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
          return;
        }
        console.log('Response from content script:', response);
        if (response && !response.error) {
          displayData(response.images, response.links, response.overview);
        } else {
          console.error('Error in images and links response:', response ? response.error : 'No response');
        }
      });

      fetchAndDisplayHeadings();
    } else {
      messageElement.style.display = 'block';
      tabContainer.style.display = 'none';
    }
  });

  document.getElementById('grid-select').addEventListener('change', function() {
    updateGridLayout(this.value);
  });

  toggleImageViewButton.addEventListener('click', () => {
    if (imageViewContainer.style.display === 'none') {
      imageViewContainer.style.display = 'block';
      toggleImageViewButton.textContent = 'Collapse';
    } else {
      imageViewContainer.style.display = 'none';
      toggleImageViewButton.textContent = 'Expand';
    }
  });

  // Set default grid layout to 4 columns
  document.getElementById('grid-select').value = '4';
  updateGridLayout('4');

  document.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (event) => {
      const anchorText = link.textContent.trim();
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'highlightAnchor', anchorText }, (response) => {
          // Log the response from content script
        });
      });
    });
  });

  // Reset highlights
  const resetButton = document.getElementById('reset-highlights');
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'resetHighlights' });
      });
    });
  }

  const toggleDetailsButton = document.getElementById('toggle-details-button');
  const detailsContainer = document.getElementById('details-container');

  toggleDetailsButton.addEventListener('click', () => {
    if (detailsContainer.style.display === 'none') {
      detailsContainer.style.display = 'block';
      toggleDetailsButton.textContent = 'Hide details';
    } else {
      detailsContainer.style.display = 'none';
      toggleDetailsButton.textContent = 'More details';
    }
  });
});

function displayOverview(data, action) {
  const metaTitleElement = document.getElementById('meta-title-wrapper');
  const metaDescriptionElement = document.getElementById('meta-description-wrapper');
  const thumbnailElement = document.getElementById('thumbnail-wrapper');

  if (action === 'getContentOverviewFromCreate' || action === 'getContentOverviewFromEdit') {
    metaTitleElement.style.display = 'none';
    metaDescriptionElement.style.display = 'none';
    thumbnailElement.style.display = 'none';
  } else {
    metaTitleElement.style.display = 'block';
    metaDescriptionElement.style.display = 'block';
    thumbnailElement.style.display = 'block';
  }

  const metaTitleText = data.metaTitle || '';
  const metaDescriptionText = data.metaDescription || '';

  const metaTitleElementContent = document.getElementById('meta-title');
  const metaDescriptionElementContent = document.getElementById('meta-description');
  const wordCountElement = document.getElementById('word-count');
  const thumbnail = document.getElementById('thumbnail');
  const thumbnailAltElement = document.getElementById('thumbnail-alt');
  const thumbnailFilenameElement = document.getElementById('thumbnail-filename');
  const thumbnailAltTextElement = document.getElementById('thumbnail-alt-text');

  if (metaTitleElementContent) {
    metaTitleElementContent.textContent = `${metaTitleText} (${data.metaTitleCount} chars)`;
    if (data.metaTitleCount >= 50 && data.metaTitleCount <= 65) {
      metaTitleElementContent.style.color = 'green';
    } else {
      metaTitleElementContent.style.color = 'red';
    }
  }

  if (metaDescriptionElementContent) {
    metaDescriptionElementContent.textContent = `${metaDescriptionText} (${data.metaDescriptionCount} chars)`;
    if (data.metaDescriptionCount >= 120 && data.metaDescriptionCount <= 160) {
      metaDescriptionElementContent.style.color = 'green';
    } else {
      metaDescriptionElementContent.style.color = 'red';
    }
  }

  if (wordCountElement) {
    wordCountElement.textContent = `${data.wordCount}`;
  }

  if (thumbnail) {
    thumbnail.src = data.thumbnail || '';
    thumbnail.alt = data.thumbnailAlt || '';
  }

  console.log("Thumbnail Alt in popup:", data.thumbnailAlt);

  if (thumbnailAltElement) {
    thumbnailAltElement.textContent = data.thumbnailAlt || '';
  }

  if (thumbnailFilenameElement) {
    thumbnailFilenameElement.innerHTML = `<a href="${data.thumbnail}" target="_blank">${data.thumbnail.split('/').pop()}</a>`;
  }

  if (thumbnailAltTextElement) {
    thumbnailAltTextElement.textContent = data.thumbnailAlt || '';
  }
}

function displayData(images = [], links = [], overview = {}) {
  const {
    totalImages = 0,
    totalImagesWithAlt = 0,
    totalImagesWithoutAlt = 0,
    totalImagesWithoutTitle = 0,
    totalImagesWithoutCaption = 0,
    totalUrls = 0,
    totalDuplicatedUrls = 0,
    totalNewTabUrls = 0,
    totalInternalLinks = 0,
    totalExternalLinks = 0,
    totalNoFollowUrls = 0,
    total4xxUrls = 0,
    imageFormatsCount = {}
  } = overview;

  const totalWebpImages = imageFormatsCount['webp'] || 0;
  const totalOtherImages = totalImages - totalWebpImages;

  // Overview tab counts
  document.getElementById('total-images').textContent = totalImages;
  document.getElementById('total-images-with-alt').textContent = totalImagesWithAlt;
  document.getElementById('total-images-without-alt').textContent = totalImagesWithoutAlt;
  document.getElementById('missing-title').textContent = totalImagesWithoutTitle;
  document.getElementById('missing-caption').textContent = totalImagesWithoutCaption;

  document.getElementById('total-urls').textContent = totalUrls;
  document.getElementById('total-duplicated-urls').textContent = totalDuplicatedUrls;
  document.getElementById('total-new-tab-urls').textContent = totalNewTabUrls;
  document.getElementById('total-internal-links').textContent = totalInternalLinks;
  document.getElementById('total-external-links').textContent = totalExternalLinks;
  document.getElementById('total-no-follow-urls').textContent = totalNoFollowUrls;
  document.getElementById('total-4xx-urls').textContent = total4xxUrls;

  // Links tab counts
  document.getElementById('link-total-urls').textContent = totalUrls;
  document.getElementById('link-total-duplicated-urls').textContent = totalDuplicatedUrls;
  document.getElementById('link-total-new-tab-urls').textContent = totalNewTabUrls;
  document.getElementById('link-total-internal-links').textContent = totalInternalLinks;
  document.getElementById('link-total-external-links').textContent = totalExternalLinks;
  document.getElementById('link-total-no-follow-urls').textContent = totalNoFollowUrls;
  document.getElementById('link-total-4xx-urls').textContent = total4xxUrls;

  // Images tab counts
  document.getElementById('total-images-overview').textContent = `${totalImages} | ${totalWebpImages}`;
  document.getElementById('total-missing-title-overview').textContent = totalImagesWithoutTitle;
  document.getElementById('total-missing-alt-overview').textContent = totalImagesWithoutAlt;
  document.getElementById('total-missing-caption-overview').textContent = totalImagesWithoutCaption;

  // Populate other image formats list
  const otherImageFormatsList = document.getElementById('other-image-formats-list');
  const otherFormatsHeader = document.getElementById('other-formats-header');
  const otherFormats = Object.keys(imageFormatsCount).filter(format => format !== 'webp').map(format => `${format} (${imageFormatsCount[format]})`).join(', ');

  if (otherFormatsHeader && otherImageFormatsList) {
    if (otherFormats) {
      otherFormatsHeader.textContent = 'All other formats:';
      otherImageFormatsList.textContent = otherFormats;
    } else {
      otherFormatsHeader.textContent = 'No other img format found';
      otherImageFormatsList.textContent = '';
    }
  }

  const imagesTable = document.getElementById('images-table').getElementsByTagName('tbody')[0];
  const linksTable = document.getElementById('links-table').getElementsByTagName('tbody')[0];
  const imageView = document.getElementById('image-view');

  if (imagesTable) {
    imagesTable.innerHTML = '';
  }
  if (linksTable) {
    linksTable.innerHTML = '';
  }
  if (imageView) {
    imageView.innerHTML = '';
  }

  images.forEach(image => {
    if (imagesTable) {
      const row = imagesTable.insertRow();
      const numberCell = row.insertCell(0);
      const altCell = row.insertCell(1);
      const captionCell = row.insertCell(2);
      const imageCell = row.insertCell(3);
      const formatCell = row.insertCell(4);

      numberCell.textContent = image.id;
      altCell.textContent = image.alt_text;
      captionCell.textContent = image.caption;
      formatCell.textContent = image.format;

      const img = document.createElement('img');
      img.src = image.url;
      img.alt = image.alt_text;
      img.classList.add('thumbnail');
      imageCell.appendChild(img);
      const fileNameLink = document.createElement('a');
      fileNameLink.href = image.url;
      fileNameLink.target = '_blank';
      fileNameLink.textContent = image.name;
      imageCell.appendChild(fileNameLink);

      row.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'scrollToImage', imageUrl: image.url });
        });
      });

      const imgElement = document.createElement('div');
      imgElement.classList.add('image-container');
      const imgTag = document.createElement('img');
      imgTag.src = image.url;
      imgTag.alt = image.alt_text;
      imgTag.classList.add('thumbnail');
      const imgInfo = document.createElement('div');
      imgInfo.classList.add('image-info');
      imgInfo.textContent = `${image.id}. ${image.name}`;
      imgElement.appendChild(imgTag);
      imgElement.appendChild(imgInfo);
      imgElement.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'scrollToImage', imageUrl: image.url });
        });
      });
      if (imageView) {
        imageView.appendChild(imgElement);
      }
    }
  });

  links.forEach(link => {
    if (linksTable) {
      const row = linksTable.insertRow();
      const numberCell = row.insertCell(0);
      const anchorCell = row.insertCell(1);
      const urlCell = row.insertCell(2);

      numberCell.textContent = link.link_id;
      anchorCell.textContent = link.anchor;
      anchorCell.style.cursor = 'pointer';

      if (!link.is_nofollow) {
        anchorCell.style.fontWeight = 'bold';
        anchorCell.style.color = 'green';
      }

      anchorCell.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'highlightAnchor', anchorText: link.anchor }, (response) => {
            // Log the response from content script
          });
        });
      });

      const urlLink = document.createElement('a');
      urlLink.href = link.url;
      urlLink.target = '_blank';
      urlLink.textContent = link.url;
      urlCell.appendChild(urlLink);

      if (link.is_duplicated) {
        urlCell.style.backgroundColor = '#FFFF00'; // Yellow
      }
      if (link.is_external) {
        numberCell.style.backgroundColor = '#D9EAD3'; // Green
      }
      if (link.is_new_tab) {
        anchorCell.style.backgroundColor = '#c4fbfd'; // Blue
      }
      if (link.is_404) {
        anchorCell.style.backgroundColor = '#ffb9b9'; 
      } else if (link.is_403) {
        anchorCell.style.backgroundColor = '#0084ff';                                                                                           
      }
    }
  });

  updateGridLayout(document.getElementById('grid-select').value);
}

function updateGridLayout(columns) {
  const imageView = document.getElementById('image-view');
  imageView.className = 'image-grid';
  imageView.classList.add(`grid-${columns}`);
}

function fetchAndDisplayHeadings() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'getHeadings' }, (headings) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
        return;
      }
      if (headings && headings.length > 0) {
        const headingsList = document.getElementById('headings-list');

        headingsList.innerHTML = '';

        headings.forEach((heading, index) => {
          const listItem = document.createElement('li');
          const headingElement = document.createElement(heading.type.toLowerCase());
          headingElement.textContent = `${heading.type}: ${heading.content}`;
          headingElement.style.cursor = 'pointer';
          headingElement.classList.add('heading-item');

          headingElement.addEventListener('click', () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              chrome.tabs.sendMessage(tabs[0].id, { action: 'scrollToPosition', position: heading.position });
            });
          });

          listItem.appendChild(headingElement);
          headingsList.appendChild(listItem);
        });
      } else {
        console.error('No headings found.');
      }
    });
  });
}


  