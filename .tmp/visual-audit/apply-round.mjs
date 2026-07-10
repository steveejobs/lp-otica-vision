import fs from 'node:fs';

const homePath = 'index.html';
let home = fs.readFileSync(homePath, 'utf8');
home = home.replace(/^\s*<a href="#escolha">Escolha<\/a>\r?\n/m, '');
const homeBlock = `      <section class="section motion-section" aria-labelledby="motion-title">
        <div class="motion-heading">
          <h2 id="motion-title">Em movimento.</h2>
        </div>
        <div class="motion-layout">
          <video class="motion-video motion-video-main" muted loop playsinline preload="metadata" poster="galeria/5%20(2).jpg" aria-label="Arma&ccedil;&otilde;es em movimento na &Oacute;tica Vision">
            <source src="galeria/video%20(2).mp4" type="video/mp4" />
          </video>
          <div class="motion-support" aria-label="Recortes visuais da &Oacute;tica Vision">
            <video class="motion-video" muted loop playsinline preload="metadata" poster="galeria/8%20(2).jpg" aria-label="Detalhe visual da &Oacute;tica Vision">
              <source src="galeria/video%20(4).mp4" type="video/mp4" />
            </video>
            <video class="motion-video" muted loop playsinline preload="metadata" poster="galeria/3%20(2).jpg" aria-label="Acabamento visual da &Oacute;tica Vision">
              <source src="galeria/video%20(3).mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </section>

      <section class="section model-stories flip-editorial-section" id="modelos" aria-labelledby="model-stories-title">
        <div class="model-stories-heading flip-heading">
          <h2 id="model-stories-title">Modelos para ver no rosto e no detalhe.</h2>
          <p>Uma sele&ccedil;&atilde;o real da Vision para comparar presen&ccedil;a, formato e acabamento.</p>
        </div>
        <div class="flip-editorial-shell" data-flip-gallery>
          <button class="flip-nav flip-nav-prev" type="button" aria-label="Imagem anterior" data-flip-prev>
            <svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15.5 5.2 8.7 12l6.8 6.8-1.4 1.4L5.9 12l8.2-8.2 1.4 1.4Z" fill="currentColor" /></svg>
          </button>
          <div class="flip-support flip-support-before" aria-hidden="true">
            <img src="galeria/4%20(1).jpg" alt="" width="1440" height="1919" loading="lazy" data-flip-side="prev" />
          </div>
          <div class="flip-gallery-frame" aria-label="Sele&ccedil;&atilde;o visual de modelos da &Oacute;tica Vision">
            <div class="flip-gallery" style="--active-image: url('galeria/6%20(1).jpg'); --next-image: url('galeria/6%20(1).jpg');">
              <div class="flip-panel flip-panel-top"></div>
              <div class="flip-panel flip-panel-bottom"></div>
              <div class="flip-panel flip-overlay-top"></div>
              <div class="flip-panel flip-overlay-bottom"></div>
            </div>
          </div>
          <div class="flip-support flip-support-after" aria-hidden="true">
            <img src="galeria/6%20(2).jpg" alt="" width="1440" height="1919" loading="lazy" data-flip-side="next" />
          </div>
          <button class="flip-nav flip-nav-next" type="button" aria-label="Pr&oacute;xima imagem" data-flip-next>
            <svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m8.5 18.8 6.8-6.8-6.8-6.8 1.4-1.4 8.2 8.2-8.2 8.2-1.4-1.4Z" fill="currentColor" /></svg>
          </button>
        </div>
        <div class="flip-actions">
          <a class="button button-secondary" href="https://api.whatsapp.com/send/?phone=5563992231522&amp;text=Ol%C3%A1%21%20Vim%20pelo%20site%20da%20%C3%93tica%20Vision%20e%20quero%20escolher%20modelos%20pelo%20WhatsApp.&amp;type=phone_number&amp;app_absent=0"><svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12.04 2.5a9.43 9.43 0 0 0-8.02 14.4l-1.1 4.05 4.16-1.09a9.42 9.42 0 1 0 4.96-17.36Zm0 1.82a7.6 7.6 0 0 1 6.43 11.66 7.6 7.6 0 0 1-10.9 2.14l-.3-.18-2.48.65.66-2.4-.2-.32a7.6 7.6 0 0 1 6.79-11.55Zm-3.12 3.8c-.17 0-.44.06-.67.32-.23.25-.88.86-.88 2.1 0 1.23.9 2.42 1.02 2.59.13.17 1.76 2.68 4.27 3.76.6.26 1.06.41 1.42.53.6.19 1.14.16 1.57.1.48-.07 1.48-.6 1.69-1.19.21-.58.21-1.08.15-1.19-.06-.1-.23-.17-.48-.3-.25-.13-1.48-.73-1.71-.81-.23-.09-.4-.13-.57.12-.17.26-.66.82-.81.99-.15.17-.3.19-.55.06-.25-.12-1.06-.39-2.02-1.25-.75-.67-1.25-1.49-1.4-1.74-.15-.26-.02-.4.11-.52.12-.12.26-.3.38-.45.13-.15.17-.26.26-.43.08-.17.04-.32-.02-.45-.06-.13-.57-1.37-.78-1.88-.2-.49-.41-.42-.57-.43h-.48Z" fill="currentColor" /></svg><span>Escolher pelo WhatsApp</span></a>
        </div>
      </section>

`;
const startPattern = /      <section class="intent-strip"[\s\S]*?      <section class="section brands-section"/;
if (startPattern.test(home)) {
  home = home.replace(startPattern, homeBlock + '      <section class="section brands-section"');
} else {
  const storyPattern = /      <section class="section model-stories"[\s\S]*?      <section class="section brands-section"/;
  if (!storyPattern.test(home)) throw new Error('home visual block not found');
  home = home.replace(storyPattern, homeBlock + '      <section class="section brands-section"');
}
const labPattern = /          <figure class="lab-media" aria-label="Detalhe visual da &Oacute;tica Vision">[\s\S]*?          <\/figure>/;
if (!labPattern.test(home)) throw new Error('lab media block not found');
home = home.replace(labPattern, `          <figure class="lab-media" aria-label="Detalhe visual da &Oacute;tica Vision">
            <img src="galeria/8%20(3).jpg" alt="Bandeja com arma&ccedil;&otilde;es da &Oacute;tica Vision" width="1320" height="1615" loading="lazy" />
          </figure>`);
if (!home.includes('data-flip-gallery') || home.includes('model-story-grid')) throw new Error('home replacement validation failed');
fs.writeFileSync(homePath, home);

const instaPath = 'instagram/index.html';
let insta = fs.readFileSync(instaPath, 'utf8');
const instaRail = `      <section class="bio-video-rail" aria-label="V&iacute;deos da &Oacute;tica Vision">
        <video class="bio-mini-video" muted loop playsinline preload="metadata" poster="../galeria/8%20(1).jpg" aria-label="Detalhe visual da &Oacute;tica Vision">
          <source src="../galeria/video%20(3).mp4" type="video/mp4" />
        </video>
        <video class="bio-mini-video" muted loop playsinline preload="metadata" poster="../galeria/5%20(2).jpg" aria-label="Arma&ccedil;&otilde;es em v&iacute;deo da &Oacute;tica Vision">
          <source src="../galeria/video%20(2).mp4" type="video/mp4" />
        </video>
        <video class="bio-mini-video" muted loop playsinline preload="metadata" poster="../galeria/4%20(2).jpg" aria-label="Recorte visual da &Oacute;tica Vision">
          <source src="../galeria/video%20(4).mp4" type="video/mp4" />
        </video>
      </section>
`;
const railPattern = /      <section class="bio-video-rail"[\s\S]*?      <section class="bio-location/;
if (!railPattern.test(insta)) throw new Error('instagram video rail not found');
insta = insta.replace(railPattern, instaRail + '      <section class="bio-location');
if ((insta.match(/bio-mini-video/g) || []).length !== 3 || !insta.includes('video%20(4).mp4')) throw new Error('instagram replacement validation failed');
fs.writeFileSync(instaPath, insta);