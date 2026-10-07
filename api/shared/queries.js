/**
 * Trusted reusable booking SELECT prefix.
 *
 * The aliases b/p/g mean bookings/properties/guests; joins add readable display names.
 * Handlers append bounded WHERE/ORDER/LIMIT clauses and supply values separately.
 */

export const bookingSelect = `
SELECT b.*,
       p.title AS property_title,
       g.name AS guest_name
FROM bookings b
JOIN properties p ON p.id=b.property_id
JOIN guests g ON g.id=b.guest_id
`;
