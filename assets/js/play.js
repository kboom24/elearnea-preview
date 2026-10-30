/* Shared play shell: top bar (back, progress dots, sound), results card. Runs a game module through El.Host. */
(function () {
  'use strict';
  const gameId = document.body.dataset.game;
  El.ui.sky(30); El.ui.speakable();
  const back = document.getElementById('back'); back.innerHTML = El.icon('back');
  El.ui.soundBtn(document.getElementById('snd'));
  const dots = document.getElementById('dots'), modal = document.getElementById('res');
  const ui = {
    setBack(url) { back.href = url; },
    title(ls) { document.title = ls.name + ' · Elearnea'; },
    progress(done, total) { if (dots.children.length !== total) dots.innerHTML = '<i></i>'.repeat(total); [...dots.children].forEach((d, i) => d.classList.toggle('on', i < done)); },
    results({ stars, acc, res, again, back: url }) {
      if (res.embedded) { if (stars) El.ui.toast(`Saved! ${stars} star${stars === 1 ? '' : 's'} on your path`); return; }
      if (!res.empty) El.sfx.win();
      // Little Lanterns (0-4): always warm, never "good try" (stars still come only from first-try mastery)
      const msg = stars >= 3 ? 'Wonderful!' : stars === 2 || El.isLittle() ? 'Great job!' : 'Good try!';
      modal.querySelector('.paper').innerHTML = `<div class="stars3">${[0, 1, 2].map(i => El.icon('star', i < stars ? 'on' : '')).join('')}</div>
        <div class="wick cheer"><img src="${El.url('assets/img/wick-sm.webp')}" alt=""></div>
        <h2>${msg}</h2><p>${res.empty ? 'Tap Again to play' : `${res.firstTry} of ${res.total} right on the first try`}</p>
        <div class="row2"><button class="btn" id="again" data-say="Again!">${El.icon('again')}Again</button><a class="btn teal" id="toPath" href="${url}" data-say="Back to the path">${El.icon('map')}Path</a></div>`;
      modal.classList.add('on'); setTimeout(() => El.Voice.say(`${msg} You earned ${stars} star${stars === 1 ? '' : 's'}!`, { rate: 1 }), 500);
      modal.querySelector('#again').onclick = () => { modal.classList.remove('on'); again(); };
    }
  };
  El.Host.run(gameId, document.getElementById('stage'), ui).catch(e => { console.error(e); });
})();
