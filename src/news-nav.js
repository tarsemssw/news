import { Element } from '../../../@polymer/polymer/polymer-element.js';
import '../../../@polymer/iron-media-query/iron-media-query.js';
import './news-header.js';

class NewsNav extends Element {
  static get template() {
    return `
    <iron-media-query query="max-width: 767px" query-matches="{{_smallScreen}}"></iron-media-query>

    <news-header app-title="[[appTitle]]" page="[[page]]" categories="[[categories]]" category="[[category]]" small-screen="[[_smallScreen]]" drawer-opened="{{_drawerOpened}}">
      <slot></slot>
    </news-header>

    <!--
      Lazy-create the drawer on small viewports.
    -->
    <dom-if if="[[_shouldRenderDrawer(_smallScreen, loadComplete)]]">
      <template>
        <news-drawer categories="[[categories]]" category="[[category]]" drawer-opened="{{_drawerOpened}}">
        </news-drawer>
      </template>
    </dom-if>
`;
  }

  static get is() { return 'news-nav'; }

  static get properties() { return {

    appTitle: String,

    page: String,

    categories: Array,

    category: Object,

    loadComplete: Boolean,

    _smallScreen: Boolean,

    _drawerOpened: Boolean

  }}

  closeDrawer() {
    this._drawerOpened = false;
  }

  _shouldRenderDrawer(smallScreen, loadComplete) {
    return smallScreen && loadComplete;
  }
}

customElements.define(NewsNav.is, NewsNav);
