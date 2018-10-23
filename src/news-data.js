/**
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js';
import { timeOut } from '@polymer/polymer/lib/utils/async.js';

let categoryList = [
  {name: 'videos', title: 'Video Status'},
  {name: 'photos', title: 'Photos'}
];

let textarea = document.createElement('textarea');

class NewsData extends PolymerElement {

  static get is() { return 'news-data'; }

  static get properties() { return {

    categories: {
      type: Array,
      value: categoryList,
      readOnly: true,
      notify: true
    },

    categoryName: String,

    articleId: String,

    offline: Boolean,

    loading: {
      type: Boolean,
      readOnly: true,
      notify: true
    },

    category: {
      type: Object,
      computed: '_computeCategory(categoryName)',
      notify: true
    },

    article: {
      type: Object,
      computed: '_computeArticle(category.items, articleId)',
      notify: true
    },

    failure: {
      type: Boolean,
      readOnly: true,
      notify: true
    }

  }}

  static get observers() { return [
    '_fetchCategory(category, offline)',
    '_fetchArticle(article, offline)'
  ]}

  _computeArticle(categoryItems, articleId) {
    if (!categoryItems || !articleId) {
      return null;
    }
    for (let i = 0; i < categoryItems.length; ++i) {
      let article = categoryItems[i];
      if (article.id === articleId) {
        return article;
      }
    }
    return null;
  }

  _fetchArticle(article, offline) {
    // Don't fail if we become offline but already have a cached version, or if there's
    // nothing to fetch, or if already loading.
    if ((offline && article && article.html) || !article || this.loading) {
      this._setFailure(false);
      return;
    }
    this._fetch('data/articles/' + article.id + '.html',
      (response) => { this.set('article.html', this._formatHTML(response)); },
      1 /* attempts */, true /* isRaw */);
  }

  _computeCategory(categoryName) {
    for (let i = 0, c; c = this.categories[i]; ++i) {
      if (c.name === categoryName) {
        return c;
      }
    }
    return null;
  }

  _fetchCategory(category, offline, attempts) {
    // Don't fail if we become offline but already have a cached version, or if there's
    // nothing to fetch, or if already loading.
    if ((offline && category && category.items) || !category || this.loading) {
      this._setFailure(false);
      return;
    }
    this._fetch('http://localhost:5051/temp',
      (response) => { this.set('category.items', this._parseCategoryItems(response)); },
      attempts || 1 /* attempts */);
  }

  _parseCategoryItems(response) {
    var finalArray = response.result
    console.log(finalArray.length)
    let items = [];

    for (let i = 0, item; item = finalArray[i]; ++i) {
      console.log(i)
      console.log(item)
      items.push({
        headline: this._unescapeText(item.title),
        href: this._getItemHref(item),
        id: item.objectId,
        imageUrl: this._getItemImage(item),
        placeholder: this._getItemImage(item), //item.placeholder,
        category: item.category.objectId,
        timeAgo: this._timeAgo(new Date(item.publishedAt).getTime()),
        author:" item.author",
        summary: this._trimRight(item.description, 100),
        readTime: item.duration + ' min read'
      });
    }
    console.log(items)
    return items;
  }

  _unescapeText(text) {
    textarea.innerHTML = text;
    return textarea.textContent;
  }

  _getItemHref(item) {
    return "desi"
    // return item.id ? '/article/' + this.categoryName + '/' + encodeURIComponent(item.id) : null;
  }

  _getItemImage(item) {
    return item.s3url_thumb;
    // return item.imgSrc ? 'data/' + item.imgSrc : '';
  }

  _timeAgo(timestamp) {
    if (!timestamp)
      return ''

    let minutes = (Date.now() - timestamp) / 1000 / 60;
    if (minutes < 2)
      return '1 min ago';
    if (minutes < 60)
      return Math.floor(minutes) + ' mins ago';
    if (minutes < 120)
      return '1 hour ago';

    let hours = minutes / 60;
    if (hours < 24)
      return Math.floor(hours) + ' hours ago';
    if (hours < 48)
      return '1 day ago';

    return Math.floor(hours / 24) + ' days ago';
  }

  _trimRight(text, maxLength) {
    let breakIdx = text.indexOf(' ', maxLength);
    return breakIdx === -1 ? text : text.substr(0, breakIdx) + '...';
  }

  _formatHTML(html) {
    let template = document.createElement('template');
    template.innerHTML = html;

    // Remove h1, .kicker, and .date from content.
    // let h1 = template.content.querySelector('h1');
    // h1 && h1.remove();
    // let kicker = template.content.querySelector('.kicker');
    // kicker && kicker.remove();
    // let date = template.content.querySelector('.date');
    // date && date.remove();

    // Remove the first image if it's the same as the item image.
    // let image = template.content.querySelector('img');
    // if (image && this._isSameImageSrc(image.src, this.article.imageUrl)) {
    //   image.remove();
    // }

    // Remove width/height attributes from all images.
    let images = template.content.querySelectorAll('img');
    for (let i = 0; i < images.length; ++i) {
      let img = images[i];
      img.removeAttribute('width');
      img.removeAttribute('height');
    }

    return template.content.querySelector('.content').innerHTML;
  }

  // _isSameImageSrc(a, b) {
  //   let regex = /[^/]+\.(jpg|png|gif)/;
  //   let aMatch = regex.exec(a);
  //   let bMatch = regex.exec(b);
  //   return aMatch && bMatch && aMatch[0] === bMatch[0];
  // }

  _fetch(url, callback, attempts, isRaw) {
    let xhr = new XMLHttpRequest();
    xhr.addEventListener('load', (e) => {
      this._setLoading(false);
      if (isRaw) {
        callback(e.target.responseText);
      } else {
        callback(JSON.parse(e.target.responseText));
      }
    });
    xhr.addEventListener('error', (e) => {
      // Flaky connections might fail fetching resources
      if (attempts > 1) {
        this._fetchDebouncer = Debouncer.debounce(this._fetchDebouncer,
          timeOut.after(200), this._fetch.bind(this, url, callback, attempts - 1));
      } else {
        this._setLoading(false);
        this._setFailure(true);
      }
    });

    this._setLoading(true);
    this._setFailure(false);
    xhr.open('GET', url);
    xhr.send();
  }

  refresh() {
    if (this.categoryName) {
      // Try at most 3 times to get the items.
      this._fetchCategory(this.category, this.offline, 3);
    }
  }

}

customElements.define(NewsData.is, NewsData);
