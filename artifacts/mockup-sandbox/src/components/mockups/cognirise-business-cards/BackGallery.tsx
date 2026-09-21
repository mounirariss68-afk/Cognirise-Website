import "./back-variants.css";

export default function BackGallery() {
  return (
    <section className="bc-gallery" aria-label="Cognirise business card reverse alternative">
      <div className="bcg-art" aria-hidden="true" />
      <div className="bcg-content">
        <img src="/__mockup/images/cognirise/logo-white.svg" alt="Cognirise" />
        <p className="bcg-note">A point of contact<br />for consequential work.</p>
        <div className="bcg-meta">
          <span>Dubai · London</span>
          <span>cognirise.com</span>
        </div>
      </div>
      <div className="bcg-qr-plate">
        <div className="bcg-qr" aria-label="Reserved vCard QR code placeholder">
          <div>
            <strong>QR</strong>
            <span>vCard code<br />to be generated</span>
          </div>
        </div>
        <span>Employee vCard · 22 mm reserve</span>
      </div>
    </section>
  );
}