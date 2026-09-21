import "./_editorial.css";

export function EditorialFront() {
  return (
    <section className="cognirise-editorial-card editorial-front" aria-label="Cognirise employee business card front">
      <div className="editorial-front__edge editorial-front__edge--left" aria-hidden="true" />
      <div className="editorial-front__edge editorial-front__edge--right" aria-hidden="true" />
      <div className="cognirise-editorial-card__safe editorial-front__safe">
        <img
          className="editorial-front__logo"
          src="/__mockup/images/cognirise/logo-blue.svg"
          alt="Cognirise"
        />
        <div className="editorial-front__identity">
          <h1 className="editorial-front__name">Your Name</h1>
          <p className="editorial-front__title">Position / Department</p>
        </div>
        <div className="editorial-front__contact-block" aria-label="Contact details">
          <p className="editorial-front__contact">
            <span className="editorial-front__contact-mark" aria-hidden="true" />
            name@example.com
          </p>
          <p className="editorial-front__contact">+971 XX XXX XXXX</p>
        </div>
      </div>
    </section>
  );
}

export default EditorialFront;