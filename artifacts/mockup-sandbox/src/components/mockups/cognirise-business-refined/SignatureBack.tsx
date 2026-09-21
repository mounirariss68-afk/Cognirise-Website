import "./_signature.css";

export function SignatureBack() {
  return (
    <section className="cognirise-signature-card signature-back" aria-label="Cognirise business card reverse with vCard QR reserve">
      <div className="signature-back__header">
        <img
          className="signature-back__logo"
          src="/__mockup/images/cognirise/logo-blue.svg"
          alt="Cognirise"
        />
        <div className="signature-back__fine-rule" aria-hidden="true" />
      </div>

      <div className="signature-back__vcard">
        <div className="signature-back__qr-reserve" aria-label="Reserved 24 millimetre vCard QR code placeholder">
          <div className="signature-back__qr-inner">
            <strong>QR</strong>
            <span>vCard placeholder</span>
          </div>
        </div>
        <p className="signature-back__caption">Reserved for employee vCard</p>
      </div>

      <p className="signature-back__footer">cognirise.com</p>
    </section>
  );
}

export default SignatureBack;