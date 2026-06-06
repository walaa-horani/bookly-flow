import { getActiveBookingPages } from "@/lib/data/public/booking"
import { ClientPortal } from "@/components/booking/client-portal"

export const dynamic = "force-dynamic"

export default async function Home() {
  const orgs = await getActiveBookingPages()

  // Map Decimal prices to serialize nicely across RSC boundary
  const serializedOrgs = orgs.map((o) => ({
    ...o,
    price: o.price ? o.price.toString() : null,
  }))

  return <ClientPortal orgs={serializedOrgs as any} />
}
