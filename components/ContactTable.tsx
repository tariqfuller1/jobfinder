export function ContactTable({ contacts }: { contacts: Array<any> }) {
  if (!contacts.length) {
    return <p className="muted">No warm contact data saved yet. Add recruiter names, hiring managers, alumni, or engineering leads as you research.</p>;
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Title</th>
          <th>Email</th>
          <th>LinkedIn</th>
          <th>Phone</th>
          <th>Status</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        {contacts.map((contact) => (
          <tr key={contact.id}>
            <td>{contact.name}</td>
            <td>{contact.title ?? contact.team ?? "—"}</td>
            <td>{contact.email ? <a href={`mailto:${contact.email}`}>{contact.email}</a> : "—"}</td>
            <td>{contact.linkedinUrl ? <a href={contact.linkedinUrl} target="_blank" rel="noreferrer">Profile</a> : "—"}</td>
            <td>{contact.phone ? <a href={`tel:${contact.phone}`}>{contact.phone}</a> : "—"}</td>
            <td>{contact.outreachStatus ?? "—"}</td>
            <td>{contact.notes ?? contact.sourceNote ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
