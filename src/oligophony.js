/*
 * Code to generate an Oligophony file, which stores the chord data for a song.
 */
(function() {
  'use strict'; 
  /**
   * Represents a measure of music.
   * @class
   * @param {Oligophony} oligophony The parent composition.
   * @param {?Number} index Optional: index at which to insert measure.
   * @param {null|Array.<String>} chords Optional: Array of chords as Strings.
   */
  var Measure = function(oligophony, index, chords) {
    this.oligophony = oligophony;
    
    // If Measure-related events don't exist yet, register them.
    this.oligophony.createEvent('Measure.create', false);
    this.oligophony.createEvent('Measure.move', false);
    
    /**
     * Array containing timeSignature[0] ChordMagic chords or nulls.
     * @type {?Object[]}
     * @private
     */
    this._beats = [];
    if(!chords) chords = []; // If none given, pass undefined.
    for(let i = 0; i < this.oligophony.timeSignature[0]; i++) {
      if(chords[i]) {
        // correct for a bug in chordMagic.
        let corrected = chords[i].replace('-7', 'm7');
        let parsed = this.oligophony.chordMagic.parse(corrected);
        parsed.raw = chords[i];
        this._beats.push(parsed);
      } else {
        this._beats.push(null);
      }
    }
    
    this.getBeat = function(beat) {
      var transpose = this.oligophony.transpose;
      var oldChord = this._beats[beat];
      if(oldChord) {
        var out = this.oligophony.chordMagic.transpose(oldChord, transpose);
        out.raw = oldChord.raw;
        if(transpose) {
          out.rawRoot = out.root;
        } else if(oldChord.raw[1] == '#') {
          out.rawRoot = oldChord.raw[0].toUpperCase() + '#';
        } else {
          out.rawRoot = oldChord.root;
        }
        return out;
      } else {
        return null;
      }
    };
    
    /**
     * Set/change the location of the measure in the song.
     * @param {Number} _index New index.
     * @public
     */
    this.setIndex = function(_index) {
      var currentIndex = this.oligophony.measures.indexOf(this);
      if(currentIndex != -1) {
        this.oligophony.measures.splice(currentIndex, 1);
      }
      if(_index > currentIndex) {
        this.oligophony.measures.splice(_index - 1, 0, this);
      } else {
        this.oligophony.measures.splice(_index, 0, this);
      }
      this.oligophony.dispatchEvent('Measure.move', {measure: this});
    };
    
    if(index === null) {
      this.oligophony.measures.push(this);
    } else {
      this.setIndex(index);
    }
    
    /**
     * Get the measure's index in the piece
     * @returns {Number} the measure's index in the piece.
     * @public
     */
    this.getIndex = function() {
      return this.oligophony.measures.indexOf(this);
    };
    
    this.oligophony.dispatchEvent('Measure.create', {measure: this});
  };
  /**
   * Stores the chord data for a song.
   * @class
   * @param {Object} [options] Optional: configuration for the song.
   * @param {Number[]} [options.timeSignature=[4,4]] Time signature for the song as an Array of length 2.
   * @param {Number} [options.transpose=0] Controls transposition.
   */
  var Oligophony = function(options) {
    // @todo docs for this??
    this.timeSignature = (options && options['timeSignature']) || [4,4];
    this.transpose = (options && options['transpose']) || 0;
    this.title = '';
    this.composer = '';
    // the original key of the song, won't change despite transposition.
    this.key = 'C'; // stop judging me ok
    
    /**
     * Oligophony's instance of ChordMagic, see that module's documentations for details.
     * @public
     */
    this.chordMagic = require('chord-magic');
    /**
     * Oligophony's instance of Tonal, see that module's documentations for details.
     * @public
     */
    this.tonal = require('tonal');
    
    /*
     * Event system to keep track of things
     * Events take the form 'Measure.create' or 'Viewer.ready' etc.
     */
     
    /**
     * Database of Oligophony events.
     * @type {Object.<Object>}
     * @private
     */
    this._eventsDB = {};
    /**
     * Register an Oligophony event, if it doesn't already exist.
     * @param {String} eventName Name of the event to register.
     * @param {Boolean} oneTime If true, future functions added to the event run immediately.
     * @returns {Object} Object that stores information about the event.
     * @public
     */
    this.createEvent = function(eventName, oneTime) {
      if(!this._eventsDB[eventName]) {
        this._eventsDB[eventName] = {
          funcs: [],
          dispatchCount: 0,
          oneTime: oneTime,
          args: {}
        };
      }
      return this._eventsDB[eventName];
    };
    /**
     * Add a function to run the next time the event is dispatched (or immediately)
     * @param {String} eventName Name of event to fire on.
     * @param {Function} func Function to run.
     * @public
     */
    this.onEvent = function(eventName, func) {
      var event = this._eventsDB[eventName];
      if(!event) event = this.createEvent(eventName, false);
      if(event.oneTime && event.dispatchCount !== 0) {
        // Pass it any arguments from the first run.
        func(event.args);
      } else {
        event.funcs.push(func);
      }
    };
    /**
     * Fire an event and run any functions linked to it.
     * @param {String} eventName Event to dispatch.
     * @param {Object} args Any arguments to pass to the functions.
     * @return {Boolean} Whether an event eventName exists.
     * @public
     */
    this.dispatchEvent = function(eventName, args) {
      var event = this._eventsDB[eventName];
      if(!event) return false;
      event.args = args;
      for(let func of event.funcs) {
        func(event.args);
      }
      return true;
    };
    
    this.createEvent('Oligophony.transpose', false);
    /**
     * Change the transposition.
     * @param {Number|String} transpose Either an integer of semitones or a chord name.
     */
    this.setTranspose = function(transpose) {
      if(Number.isInteger(transpose)) {
        this.transpose = transpose % 12;
      } else {
        let orig_chord = this.chordMagic.parse(this.key);
        let new_chord = this.chordMagic.parse(transpose);
        this.transpose = this.tonal.semitones(orig_chord.root + '4', new_chord.root + '4');
        if(orig_chord.quality != new_chord.quality) {
          // for example, if the song is in CM and user transposes to Am
          // assume it's major or minor, if you try to transpose to some other thing I'll cry.
          if(new_chord.quality == 'Minor') {
            this.transpose = (this.transpose + 3) % 12;
          } else {
            this.transpose = (this.transpose - 3) % 12;
          }
        }
      }
      this.dispatchEvent('Oligophony.transpose', {});
    };
    
    
    /**
     * A list of measures and nulls, in order. Null represents a newline.
     * @type {?Measure[]}
     * @public
     */
    this.measures = [];
    
    /**
     * Append a measure to the piece
     * @param {String[]} chords Array of chords as Strings.
     * @param {?Number} index Optional: Index for the new measure.
     * @return {Measure} The generated measure.
     * @public
     */
    this.addMeasure = function(chords, index) {
      return new Measure(this, index, chords);
    };
    
    this.createEvent('Oligophony.addNewline', false);
    /**
     * Append a measure to the piece
     * @param {?Number} index Optional: Index for the newline in measures array.
     * @public
     */
    this.addNewline = function(index) {
      if(index === null) {
        this.measures.push(null);
      } else {
        this.measures.splice(index, 0, null);
      }
      this.dispatchEvent('Oligophony.addNewline', {});
    };
    
    /**
     * Parse a song from an Array containing nulls (newlines) or Arrays of beats.
     * @param {Array.<null, Array>} array The array to parse into a song.
     * @public
     */
    this.parseArray = function(array) {
      for(let measure of array) {
        if(measure) {
          this.addMeasure(measure, null);
        } else {
          this.addNewline(null);
        }
      }
    };
    
    this.createEvent('Oligophony.import', false);
    
    /**
     * Parse a song from an Object.
     * @param {Object} song The song to load.
     * @param {String} [song.title] Title of the song.
     * @param {String} [song.composer] Composer of the song.
     * @param {Number[]} [song.timeSignature] Time Signature of the song.
     * @param {String} [song.key] Original key of the song.
     * @param {Array.<null, Array>} song.chords The chords array to parse.
     * @public
     */
    this.import = function(song) {
      if(song.title) this.title = song.title;
      if(song.composer) this.composer = song.composer;
      if(song.timeSignature) this.timeSignature = song.timeSignature;
      if(song.key) this.key = song.key;
      this.parseArray(song.chords);
      this.dispatchEvent('Oligophony.import', {});
    };
  };

  module.exports = Oligophony;
})();
