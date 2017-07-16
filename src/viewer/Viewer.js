/*
 * Code to generate a Viewer object. This will be extended to an editor in
 * a separate file so that that functionality is only loaded as needed.
 */
(function() {
  'use strict';  
  /**
   * Viewer constructor. A Viewer displays an Oligophony.
   * @class
   * @param {undefined|Object} options Optional: options for the Viewer.
   */
  var Viewer = function(options) {
    /**
     * SVG width, can be user-customized. May change w/ resize??
     * @type {Number}
     */
    this.width = (options && options['width']) || 1400;
    /**
     * SVG height, can be user-customized.
     * @type {Number}
     */
    this.height = (options && options['height']) || 700;
    /**
     * SVG height of each row of measures, can be user-customized.
     * @type {Number}
     */
    this.rowHeight = (options && options['rowHeight']) || 60;
    
    /**
     * Font size for big text (smaller text will be relatively scaled)
     * @type {Number}
     */
    this.fontSize = (options && options['fontSize']) || 50;
    
    /**
     * SVG width for each measure.
     * @type {Number}
     */
    this.colWidth = this.width / 4;
    /**
     * SVG distance between beats in a measure.
     * @type {Number}
     */
    this.beatOffset = this.colWidth / 4;
    
    /**
     * I keep changing my mind about the prettiest font to use.
     * It's not easy to request fonts from Google as WOFF.
     * @const
     */
    const FONT_URLS = {
      openSans: 'https://fonts.gstatic.com/s/opensans/v14/cJZKeOuBrn4kERxqtaUH3T8E0i7KZn-EPnyo3HZu7kw.woff',
      slabo27px: 'https://fonts.gstatic.com/s/slabo27px/v3/PuwvqkdbcqU-fCZ9Ed-b7RsxEYwM7FgeyaSgU71cLG0.woff'
    };
    
    var self = this;
    require('opentype.js').load(FONT_URLS.slabo27px, function(err, font) {
      if (err) {
        alert('Could not load font: ' + err);
      } else {
        /**
         * opentype.js font object.
         * @type {Font}
         */
        self.font = font;
        if(self.oligophony) {
          for(let measure of self.oligophony.measures) {
            measure.measureView.render();
          }
        }
      }
    });
    
    /**
     * Take a string and turn it into an SVGPathElement.
     * @param {String} text The string to path-ify.
     * @returns {SVGPathElement} The string as a path.
     */
    this.textToPath = function(text) {
      var path = document.createElementNS(this.SVG_NS, 'path');
      var pathdata = this.font.getPath(text, 0, 0, this.fontSize).toPathData();
      path.setAttributeNS(null, 'd',pathdata);
      return path;
    };
    
    /**
     * A Viewer isn't initially attached to any Oligophony. An Oligophony
     * will attach itself to the Viewer using Oligophony.attachViewer(<Viewer>).
     * @type {?Oligophony}
     * @public
     */
    this.oligophony = null;
    
    /**
     * Path data for various shapes.
     * @type {String[]}
     * @const
     */
    this.PATHS = require('./svg_constants');
    
    /**
     * When generating SVG-related elements in JS, they must be namespaced.
     * @type {String}
     * @const
     */
    this.SVG_NS = 'http://www.w3.org/2000/svg';
    /**
     * The SVG element with which the user will interact.
     * @type {SVGDocument}
     * @private
     */
    this._svgElem = document.createElementNS(this.SVG_NS, 'svg');
    this._svgElem.setAttribute('width', this.width);
    this._svgElem.setAttribute('height', this.height);
    
    /**
     * Append editor element to a parent element.
     * @param {HTMLElement} parent The element to append the editor element.
     * @public
     */
    this.appendTo = function(parent) {
      parent.appendChild(this._svgElem);
    };
    
    // for extensibility.
    this.MeasureView = require('./MeasureView');
    this.BeatView = require('./BeatView');
    
    /**
     * Called by Oligophony to create a MeasureView for a Measure and link them.
     * @param {Measure} measure The corresponding Measure.
     * @public
     */
    this.createMeasureView = function(measure) {
      new this.MeasureView(this, measure);
    };
    
    /**
     * Layout measures and newlines.
     * @public
     */
    this.reflow = function() {
      var row = 1;
      var col = 0;
      for(let measure of this.oligophony.measures) {
        let x = this.colWidth * col++;
        if(x > this.width || measure === null) {
          x = 0;
          col = 0;
          row++;
          if(measure === null) continue;
        }
        let y = this.rowHeight * row;
        measure.measureView.setPosition(x,y);
      }
    };
  };

  module.exports = Viewer;
})();
