import Link from "next/link";

export default function TermsPage() {
  return <main className="page-shell">
    <nav className="page-nav"><Link className="brand" href="/">hyderabad<span>.rent</span></Link><Link href="/">← Back to map</Link></nav>
    <div className="page-card"><div className="eyebrow">Beta terms</div><h1>Community data, not a guarantee</h1><p className="intro">Hyderabad Rent is a community rental-transparency beta. Rent reports, listings and seeker posts may be incomplete, outdated or inaccurate. Verify a property, owner, payment request and legal documents independently before making commitments.</p><p>Do not submit private identity documents, passwords, exact apartment unit numbers or sensitive personal information. Spam, impersonation, fraudulent listings and unlawful content may be removed.</p></div>
  </main>;
}
