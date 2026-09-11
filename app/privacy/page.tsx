import Link from "next/link";

export default function PrivacyPage() {
  return <main className="page-shell">
    <nav className="page-nav"><Link className="brand" href="/">hyderabad<span>.rent</span></Link><Link href="/">← Back to map</Link></nav>
    <div className="page-card"><div className="eyebrow">Privacy</div><h1>Privacy basics</h1><p className="intro">Public rent entries show rental information and an approximate map location. Private contact information for listings and seekers is stored separately and is not returned by the public entries API.</p><p>Do not submit apartment unit numbers, passwords, identity documents, or other sensitive personal information. Before a public launch, add your final legal entity/contact details and a complete privacy policy appropriate for your business.</p></div>
  </main>;
}
