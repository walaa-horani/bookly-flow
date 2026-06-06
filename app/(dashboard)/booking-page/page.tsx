import { requireOrgContext } from "@/lib/org-context"
import { getBookingPage } from "@/lib/data/booking-page"
import { buttonVariants } from "@/components/ui/button"
import { CopyButton } from "@/components/ui/copy-button"
import Link from "next/link"

export default async function BookingPageDashboard() {
  const ctx = await requireOrgContext()
  const page = await getBookingPage(ctx.orgId)

  if (!page) {
    return (
      <div className="space-y-6 py-6 max-w-4xl mx-auto">
        <div className="text-center py-16 border border-border-light rounded-2xl bg-surface-container-low/40 space-y-4">
          <span className="material-symbols-outlined text-[48px] text-neutral-gray/50">link_off</span>
          <h1 className="font-heading text-xl font-bold text-text-primary">No Booking Page Active</h1>
          <p className="text-sm text-neutral-gray max-w-md mx-auto">
            You don&apos;t have a booking page configured yet. Create one now to start accepting client appointments.
          </p>
          <Link href="/booking-page/edit" className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-full font-medium text-xs inline-flex items-center gap-2 transition-all">
            <span className="material-symbols-outlined text-[16px]">add</span>
            Create Booking Page
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-text-primary">{page.title}</h1>
          <div className="flex items-center gap-2 text-xs text-neutral-gray mt-1">
            <span>Hosted by</span>
            <span className="font-semibold text-text-primary">{ctx.org.name}</span>
            <span className="material-symbols-outlined text-[14px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/book/${page.slug}`} target="_blank" className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-container text-text-primary rounded-full font-medium text-xs border border-border-light transition-colors">
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
            Preview Page
          </Link>
          <Link href="/booking-page/edit" className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-full font-medium text-xs flex items-center gap-2 transition-colors">
            <span className="material-symbols-outlined text-[16px]">edit</span>
            Edit Session
          </Link>
        </div>
      </div>

      {/* Bento Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Main Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Hero Session Banner */}
          <div className="aspect-[2.56/1] w-full rounded-xl overflow-hidden border border-border-light relative group bg-surface">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              alt="Technical Consultation Backdrop" 
              className="w-full h-full object-cover" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuADwNQjdufNLO7K0hcNPcr_--WvniWrOwSfiBII_bT-y8NW7ltVHcy0LWMfr996XyQ3jyiDVih5s-_yyxhbfWhhpcWDoopfuqcx6XNnuyQfNtNAzNTECit99FmLQvrV6wHKsuOIHepakIZQC1cuFOBNwmdDa_L97Y9j8HcOT8yh5aVBmB3JbWnSdJURm_b0kgoXXWF5u1DTsymkSjnSk6UWb5u8hmyY0lxZuEuRiNCKNIagbLcKQvMv2fianREy_v_F87ZjClvB5-MM"
            />
            <div className="absolute inset-0 bg-black/10"></div>
          </div>

          {/* Session Details */}
          <div className="bg-white border border-border-light rounded-xl p-6 shadow-sm">
            <h2 className="font-heading text-lg font-bold text-text-primary mb-4">Session Details</h2>
            <p className="text-sm text-neutral-gray leading-relaxed mb-6">
              {page.description || "A dedicated 1-on-1 scheduling service. Provide details and customize settings to fit your business or workflow."}
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-border-light">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-neutral-gray flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">timer</span> Duration
                </span>
                <span className="text-sm font-bold text-text-primary">{page.duration} Minutes</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-neutral-gray flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">payments</span> Price
                </span>
                <span className="text-sm font-bold text-text-primary">
                  {page.price ? `$${page.price} ${page.currency}` : "Free"}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-neutral-gray flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">language</span> Platform
                </span>
                <span className="text-sm font-bold text-text-primary">Google Meet</span>
              </div>
            </div>
          </div>

          {/* URL Copy Widget */}
          <div className="bg-surface rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border border-border-light">
            <div className="flex-1 w-full overflow-hidden">
              <label className="text-xs font-semibold text-neutral-gray block mb-1">Direct Booking Link</label>
              <code className="text-xs font-mono bg-white px-3 py-2 rounded-lg border border-border-light block overflow-x-auto whitespace-nowrap text-text-primary">
                {`/book/${page.slug}`}
              </code>
            </div>
            <CopyButton text={`/book/${page.slug}`} label="Copy URL" className="bg-primary hover:bg-primary-hover text-white text-xs h-10 px-6 rounded-full w-full sm:w-auto font-medium" />
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Availability Calendar Summary */}
          <div className="bg-white border border-border-light rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-text-primary mb-4">Upcoming Schedule</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 hover:bg-surface rounded-lg cursor-pointer transition-colors group">
                <span className="text-xs font-semibold text-text-primary">Monday — Friday</span>
                <span className="text-xs font-bold text-success flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-success"></span> Available
                </span>
              </div>
              <div className="flex justify-between items-center p-2 hover:bg-surface rounded-lg cursor-pointer transition-colors group">
                <span className="text-xs font-semibold text-text-primary">Saturday — Sunday</span>
                <span className="text-xs font-bold text-neutral-gray">Fully Booked</span>
              </div>
            </div>
            <Link href="/availability" className="w-full mt-4 h-9 border border-border-light rounded-full text-xs font-bold text-text-primary hover:bg-surface transition-colors flex items-center justify-center">
              Edit Availability
            </Link>
          </div>

          {/* Creator Profile Stats */}
          <div className="bg-white border border-border-light rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full overflow-hidden border border-border-light bg-surface flex items-center justify-center">
                <span className="material-symbols-outlined text-neutral-gray text-[28px]">account_circle</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary leading-tight">{ctx.org.name}</h3>
                <p className="text-[10px] text-neutral-gray mt-0.5">Verified Host</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-surface rounded-lg p-3">
                <div className="text-lg font-black text-text-primary">4.9</div>
                <div className="text-[10px] text-neutral-gray font-semibold">Rating</div>
              </div>
              <div className="bg-surface rounded-lg p-3">
                <div className="text-lg font-black text-text-primary">150+</div>
                <div className="text-[10px] text-neutral-gray font-semibold">Sessions</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Workshops Section */}
      <section className="mt-8 pt-8 border-t border-border-light">
        <h2 className="font-heading text-lg font-bold text-text-primary mb-6">More Workshops &amp; Courses</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Workshop 1 */}
          <div className="flex flex-col cursor-pointer group gap-2">
            <div className="relative aspect-video rounded-xl overflow-hidden bg-surface mb-1 border border-border-light">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                alt="Kubernetes Course" 
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC40_uUf4830cE764MsnaudRm6fZRUVSSGVNLozrr7Hs5a6naacOEARFnvWo9Cd1Pp0rvhbLV0R7QvGkWX9w1eeOL8noKbuoObESxOEaKBYiWtDFGdSUSVKL4Rbiu2kF6nQueRU5bEQZ2tpTOKHxlgXPPj-bhepgdNdVAYyx0DI-mo8-6U0EiJu2hBV9Bf5UJZ06qKjmvak-bD8SUx695FWN2K5qiz-IyigldtdchPmthRamYFcHjUMVYiyJ1_sM0fEIq6tppaCTIwW"
              />
              <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-semibold px-1.5 rounded-sm">12:45</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <h4 className="text-xs font-semibold text-text-primary line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                Kubernetes for Absolute Beginners: From Zero to Cluster
              </h4>
              <p className="text-[10px] text-neutral-gray mt-1">TechStream Pro</p>
              <p className="text-[10px] text-neutral-gray">120K views • 2 days ago</p>
            </div>
          </div>

          {/* Workshop 2 */}
          <div className="flex flex-col cursor-pointer group gap-2">
            <div className="relative aspect-video rounded-xl overflow-hidden bg-surface mb-1 border border-border-light">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                alt="System Design Course" 
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuD2sclK-dMuyIXxZFFpnXsmr0PMjRR9cZ9OTyFHChjB-Zg0Er35-fFCOkbrmpEw88ecExMjir-ZM4rD1d_YijzFO-Q_nh0ssiBUDZrZpmgc4H2iQ1lWzJk_KUEWPncfZsDttgXmKJxH3ygZTcI7wNjmdIBtyKZqKz9dk0uHuwrEURWOsxRMNBTBsCvkPazjpU1EDWeEQzHlWUYirc-ECevm06H-TMMQR-_Etiuw8OWdgCCLAJpxpb6KgOB8YGXU3Vy5fXzf9rOUUgEp"
              />
              <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-semibold px-1.5 rounded-sm">24:12</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <h4 className="text-xs font-semibold text-text-primary line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                System Design Masterclass: How to scale to 10M users
              </h4>
              <p className="text-[10px] text-neutral-gray mt-1">TechStream Pro</p>
              <p className="text-[10px] text-neutral-gray">85K views • 1 week ago</p>
            </div>
          </div>

          {/* Workshop 3 */}
          <div className="flex flex-col cursor-pointer group gap-2">
            <div className="relative aspect-video rounded-xl overflow-hidden bg-surface mb-1 border border-border-light">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                alt="Live Q&A Course" 
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBtjnjnbzGjRz066o2F8InZ9r878JSZuiZOid0huXTKEZwXoVecpNXvcl_GZombe1cDCsjhLMBU0iLgXyaEgy5NPwQD-K0MrcUoi3XgF-9aSNACLNtV8tvzDA7bW9tb_9mi62mh-VIOwFAKIe-d_U-_ppdB0VrPx1Uf5ZoYLxPeU1lJhuYe7Z8bi8_6b3eobAPtwWoyse_IfOxwuCGkluyjwk6aMrwO2k1rmo1WsfXQSPEB5QbAZp9Gvn-bBNl41MNMgnAjmAKStwIU"
              />
              <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-semibold px-1.5 rounded-sm">LIVE</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <h4 className="text-xs font-semibold text-text-primary line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                Live Q&amp;A: Career Growth in Tech &amp; Interview Tips
              </h4>
              <p className="text-[10px] text-neutral-gray mt-1 flex items-center gap-1">
                TechStream Pro
                <span className="material-symbols-outlined text-[13px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              </p>
              <div className="bg-primary px-1.5 py-0.5 rounded-sm text-white inline-block mt-1 text-[9px] font-bold w-fit">LIVE</div>
            </div>
          </div>

          {/* Workshop 4 */}
          <div className="flex flex-col cursor-pointer group gap-2">
            <div className="relative aspect-video rounded-xl overflow-hidden bg-surface mb-1 border border-border-light">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                alt="Microservices Course" 
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBUBZ3K4BeS6eS2vvFPPxWGkn8VtGsZZAoHQTa2a1KLLyWyZ83XejF_xcVvkNajJlR48g9Sq3_LmWFCrhYIp6pWGBU3AbZKNGcQjNIMTG4unMA9zv_wEVe8w8irin1aE5JkbbvWeisso-MvEiCI2BLld1t-bbccIhvR0JnYk94nXGkNig1vWf2CN0-o1Mknl3QBU4ZhGiYTOxbLiI6ZlKtssk5qcSdEuRXn9Fln6ToA_-MrXFDnQ-Y7H2cyhACi1VaiB228viTTkXaS"
              />
              <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-semibold px-1.5 rounded-sm">08:30</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <h4 className="text-xs font-semibold text-text-primary line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                Micro-services Architecture Explained in 8 Minutes
              </h4>
              <p className="text-[10px] text-neutral-gray mt-1">TechStream Pro</p>
              <p className="text-[10px] text-neutral-gray">412K views • 1 month ago</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
