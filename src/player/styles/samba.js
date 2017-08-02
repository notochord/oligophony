(function() {  
  module.exports = function(playback) {
    var style = {};
    
    style.load = function() {
      playback.requireInstruments([
        'acoustic_grand_piano',
        'acoustic_bass'
      ]);
    };
    
    var drums = function() {
      var hatPattern;
      if(playback.measureInPhrase % 2 === 0) {
        hatPattern = playback.randomFrom([
          [2,3,3.5,4.5],
          [1,2,3,3.5,4,4.5]
        ]);
      } else {
        hatPattern = playback.randomFrom([
          [1.5,2,3,4,4.5],
          [1.5,2,3,3.5,4.5]
        ]);
      }
      playback.schedule(() => playback.drums.hatHalfOpen(0.1), hatPattern);
      
      playback.schedule(() => playback.drums.kick(0.2), [1,2.5]);
      playback.schedule(() => playback.drums.hatClosed(0.1), [2,4]);
    };
    
    var bass = function() {
      if(playback.beats[2] || playback.beats[4]) {
        for(let i = 1; i < playback.beats.length; i++) {
          let beat = playback.beats[i];
          if(beat) {
            playback.schedule(() => {
              playback.playNotes({
                notes: beat.root + 2,
                instrument: 'acoustic_bass',
                beats: 1,
                velocity: 127
              });
            }, i);
          }
        }
      } else {
        if(playback.beats[3]
          && playback.beats[3].root != playback.beats[1].root) {
          playback.playNotes({
            notes: playback.beats[1].root + 2,
            instrument: 'acoustic_bass',
            beats: 2,
            velocity: 127
          });
          playback.schedule(() => {
            playback.playNotes({
              notes: playback.beats[3].root + 2,
              instrument: 'acoustic_bass',
              beats: 2,
              velocity: 127
            });
          }, 3);
        } else {
          playback.playNotes({
            notes: playback.beats[1].root + 2,
            instrument: 'acoustic_bass',
            beats: 1.5,
            velocity: 127
          });
          // @todo dim?
          let low5 = playback.tonal.transpose(playback.beats[1].root + 1, 'P5');
          let coinFlip = Math.random() < 0.5;
          if(coinFlip) {
            playback.schedule(() => {
              playback.playNotes({
                notes: low5,
                instrument: 'acoustic_bass',
                beats: 2.5,
                velocity: 127
              });
            }, 2.5);
          } else {
            playback.schedule(() => {
              playback.playNotes({
                notes: low5,
                instrument: 'acoustic_bass',
                beats: 1.5,
                velocity: 127
              });
            }, 2.5);
            playback.schedule(() => {
              playback.playNotes({
                notes: playback.beats[1].root + 2,
                instrument: 'acoustic_bass',
                beats: 1,
                velocity: 127
              });
            }, 4);
          }
        }
      }
    };
    
    style.onMeasure = function() {
      drums();
      bass();
      
      playback.playNotes({
        notes: playback.chordToNotes(playback.beats[1], 4),
        instrument: 'acoustic_grand_piano',
        beats: 2,
        roll: true
      });
      playback.schedule(() => {
        let beat = playback.beats[3] || playback.beats[1];
        playback.playNotes({
          notes: playback.chordToNotes(beat, 4),
          instrument: 'acoustic_grand_piano',
          beats: 2,
          roll: true
        });
      }, 3);
    };
    
    return style;
  };
})();
