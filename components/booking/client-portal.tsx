"use client"

import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ClientBookingModal } from "./client-booking-modal"
import { ArrowRight, LogOut, User as UserIcon } from "lucide-react"
import Link from "next/link"

type BookingPageData = {
  id: string
  slug: string
  title: string
  description: string | null
  duration: number
  price: any | null // Decimal
  currency: string
  brandColor: string | null
  logoUrl: string | null
  org: {
    id: string
    name: string
    tier: "FREE" | "PRO"
  }
}

type Props = {
  orgs: BookingPageData[]
}

export function ClientPortal({ orgs }: Props) {
  const { data: session } = useSession()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPage, setSelectedPage] = useState<BookingPageData | null>(null)

  const filteredOrgs = orgs.filter((page) => {
    const search = searchQuery.toLowerCase()
    return (
      page.org.name.toLowerCase().includes(search) ||
      page.title.toLowerCase().includes(search) ||
      (page.description && page.description.toLowerCase().includes(search))
    )
  })

  // Helper to dynamically match custom images/avatars based on keywords for pixel-perfect design
  const getProviderMedia = (title: string, orgName: string) => {
    const combined = `${title} ${orgName}`.toLowerCase()
    if (combined.includes("sarah") || combined.includes("miller") || combined.includes("therap") || combined.includes("wellness")) {
      return {
        thumbnail: "https://lh3.googleusercontent.com/aida-public/AB6AXuC0K3LovooZHmv0G9ak3zXxN390-Zhk8myHU1YgaDy0mogGYXIxAeerXZTmbuEYfik03GcWC4H9GedK8k-njKKrhhcJQZg_2Yvw2eMwFjl4FxgUMSdXZFOnoiWH7D4GZM2cqnWXQC3LKea64FqJJ-OsaPq9eL8YAI4zI1AY2KbcagARFWpUxaXY37FPc0NrHhRrOnHEIx5cFxkLpv0iTkFW-yD_y_WwlB8JkbZCc3KufCn1FZya7v9em-Ig_59m-Jh3F5BPCAtq8wJj",
        avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuB5HcMJ0_DcUnI2msRyQLqSW8E4I79atq6euJ9wPNfZAzbpIauas4GIMAUJsdDQrP44zLy3cy63HAN1jQINgU1Sk1uWvEXGU80WLkJ3NAbJShKBZb-RWBTcqawxRDP77pQ1NeSZV8kdjNjUpkQWcEYoDOZwdedN2u5S5xb9G5hU1kFctDjRHX2ZC5zaWMIzDTB0IPa8Z5BJMJxXmVWO370r0oypgMjTyLtCwLofTxot9y58gngkFN-OyHpMKXidqGq1a0ASP2Ym4XzI"
      }
    }
    if (combined.includes("marcus") || combined.includes("chen") || combined.includes("fit") || combined.includes("strength") || combined.includes("train")) {
      return {
        thumbnail: "https://lh3.googleusercontent.com/aida-public/AB6AXuCMtAItAm4VDg0GSxMVhm-6FXCrzX7CrhFQRnN1d5MCh3rcm8lgQtEPYCI9XLzy5KN92X0K4sfUoDJWkirqXPHTV6fzcZMmZ5acoFWsKPC9O8MmLQclZ0qHzy9i7sWzOZH_LhqfxE9La_40EZiip2mnA85NSfUVU1wxZzqvYQ-4bwe9N7fI0UKy6Wb29G-XfeeLxmEN85D4OXden1xWBgWz-U5Pq5xm_9WSRZoHGy6hIJ5PaCqyEbR-c27hrCcXpd-LZKrZVU0lFM98",
        avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuClf7y38_XoKN0VQjwNH5XwVE_WcJTPSNGJOYA8WyI0ruOo38gOgNOnkzhBlIElcW6Vaxbm0SOPDpWOwrfal0Zegg-yjFO1JVzhGAbnnd_QWIOEgCpMk_5LwBJP4cHN0N2hOBLPANKF4naSBCIgNRHIXlK237RJ0aE2JkMol_0rs45faPM-bvyJ1wiMfHy7oSv4U8XmkhuPM_s1eAmZEe7eJR9uo7Y-yW5CYHyzap97kj7o6AWVLnuGZLUJhLaK_-lct2fTTqJM4iAo"
      }
    }
    if (combined.includes("david") || combined.includes("wright") || combined.includes("law") || combined.includes("legal") || combined.includes("consult")) {
      return {
        thumbnail: "https://lh3.googleusercontent.com/aida-public/AB6AXuCcAAu5XJFaN6nl6cAoWbiNDQVtMyZ59ajXhUBmu_kMikTHm9LAV69lUISN1BMPdMpYrICKxpy-QOrsnB8i2u4ywc0Sk1ZIWezUej5fcHF5Iw41WY7UvcJ7ShF4_XCsg3vQGgARs2CbxNhKyff-nrZF4ywkIoFBWs8A5nwOaBnaihL3Nqe94GVG73k2AnOuXKNtvV2x6P3HPJaHUIWZ-ULEscdCvjz-HQP7VHtCj9UKvrSMkUnC9t2MkRQynEnd4EZwC8_vDDhuh3zh",
        avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDlHa8jPhWpW78FYVVhGZ-RJSA7gmzF6HTWaTvp6xLACLGlYAJKmrSiBaAwmETTzmhigxKkA3irU3TQVgQeN-6EHEu19drH7NmMjHHWXEZWI9hditnUzLpGytqbGx9Zp_-Kn-V3H_2xM0ci9lYfOYFnEs9Fa-YahCnFcSTNT0n4WGF-9zRAEwzA8qy9JqekZq9NnFXH1WWuWs9Muaywp9E7GZj8-d1HhyYI06koK-MscyDz3YbJQOyVKyfEiOVfaDFWJZM6G2UHimeH"
      }
    }
    if (combined.includes("elena") || combined.includes("rodriguez") || combined.includes("tech") || combined.includes("dev") || combined.includes("code") || combined.includes("mentor")) {
      return {
        thumbnail: "https://lh3.googleusercontent.com/aida-public/AB6AXuCLxtTJYe80Meml3vxgwd4T7TM9XVlbcbmuld6RE204kxL4zhfF4YxxDCmEPU1lYcF5WA8TFBIaIap0loT2IiVfyq7x1Hm_zSybPXreUVXkhMwi6ynEwuunz5hdTnHNxhpOkUx5OjP75IM3AR6eOVCS62RAB9i_zMkCoBB147KQIIZeIH0ZEQDorj4pIZLbKJ-LAr7Oxwh7Gwne5-G0Yr3PX2HwykCGCFJPdLn4WTOW2NXskWRf6-JKYWb5o1jsndyiqHAI_pmRCgbO",
        avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDwBacVBiT8egeWEsq4K9KHgRxP5J5EoRjsrFKguy7y3fn8OJssrDk-9Wxa_ImYfenZ6X7qncWKJzgVH7ms-KJxI6IHZV-u0naC8WgE3c_unm0vqC8WQuf9a85NesVqVXczAiwmA4Pz301YUQyb-TUGU8CQ0vRlceRGcSyP4FVlQ3XIGv_wMBFNsnAynt3RTBliGjB30vrHP8YJfRoNqbBGPTeRM8r2EBdVoyTuVMifeEni9IJjqI0etcB_sun9_brtgXuxJYD_70Gu"
      }
    }
    return {
      thumbnail: "https://lh3.googleusercontent.com/aida-public/AB6AXuADwNQjdufNLO7K0hcNPcr_--WvniWrOwSfiBII_bT-y8NW7ltVHcy0LWMfr996XyQ3jyiDVih5s-_yyxhbfWhhpcWDoopfuqcx6XNnuyQfNtNAzNTECit99FmLQvrV6wHKsuOIHepakIZQC1cuFOBNwmdDa_L97Y9j8HcOT8yh5aVBmB3JbWnSdJURm_b0kgoXXWF5u1DTsymkSjnSk6UWb5u8hmyY0lxZuEuRiNCKNIagbLcKQvMv2fianREy_v_F87ZjClvB5-MM",
      avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuANvYvgeAsx6fpxZ9BzFnhDI5kgE3Ov5IIWs5qI7d3ntu6Z0jWQ6SWeW_P0p0NQEGWwFsAI8xMI7hzcbscUt_gcpoT5Clsj1U99l_1tHNoKkdx-YKxEI70Dvn1cjfswyYr6JYNhExvf-4xTjrit_e9QP_j_Yt7HvblzksxwYzIXmtjnj7jMV6mzBZpQjoGXe5ccRlC0UlLqaU0Wt6g35gvzTf2Guicy2lp-7SZ0LX8-v2KUDSuPVFE8uklUmL0hur8eSzb5QgGenLyH"
    }
  }

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans">
      
      {/* TopNavBar */}
      <header className="fixed top-0 w-full h-[56px] z-50 bg-background flex justify-between items-center px-4 md:px-6 shadow-sm border-b border-border-light">
        <div className="flex items-center gap-4">
          <button className="material-symbols-outlined cursor-pointer p-2 hover:bg-surface rounded-full border-none">menu</button>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              play_circle
            </span>
            <span className="font-heading text-xl font-black text-primary tracking-tighter cursor-pointer">StreamTube</span>
          </div>
        </div>

        {/* Search bar in center */}
        <div className="hidden md:flex flex-1 max-w-[560px] mx-6 items-center">
          <div className="flex flex-1 items-center border border-border-light rounded-l-full overflow-hidden bg-white group focus-within:border-secondary transition-colors h-9">
            <input 
              className="w-full bg-transparent border-none focus:ring-0 text-sm py-1 px-3 outline-none text-text-primary" 
              placeholder="Search providers..." 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="bg-search-btn-bg border border-l-0 border-border-light px-6 h-9 rounded-r-full hover:bg-surface transition-colors cursor-pointer flex items-center justify-center">
            <span className="material-symbols-outlined text-neutral-gray text-[20px]">search</span>
          </button>
        </div>

        {/* Actions / Auth */}
        <nav className="flex items-center gap-4">
          {session ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end text-right">
                <span className="text-xs font-semibold text-text-primary">{session.user.name ?? session.user.email}</span>
                <span className="text-[10px] text-neutral-gray capitalize">
                  {session.user.accountType.toLowerCase()} Account
                </span>
              </div>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <UserIcon className="h-4 w-4" />
              </div>
              
              {session.user.accountType === "PROVIDER" && (
                <Link href="/dashboard">
                  <Button size="sm" className="bg-primary hover:bg-primary-hover text-white text-xs h-9 rounded-full font-medium px-4 gap-1 flex items-center">
                    <span>Creator Studio</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-neutral-gray hover:text-text-primary hover:bg-surface rounded-full gap-1.5 h-9 px-3 font-medium text-xs border border-border-light"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="h-9 px-4 rounded-full font-medium text-xs text-neutral-gray hover:text-text-primary">
                  Sign in
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="bg-primary hover:bg-primary-hover text-white h-9 px-4 rounded-full font-medium text-xs">
                  Sign up
                </Button>
              </Link>
            </div>
          )}
        </nav>
      </header>

      <div className="flex flex-1 pt-[56px] pb-[56px] md:pb-0">
        {/* SideNavBar */}
        <nav className="fixed left-0 top-[56px] w-[80px] h-[calc(100vh-56px)] z-40 bg-background flex flex-col pt-4 overflow-y-auto hidden md:flex border-r border-border-light no-scrollbar">
          <div className="px-1.5 flex flex-col gap-1 items-center w-full">
            <div className="flex flex-col items-center justify-center w-full py-3 px-1 bg-surface font-bold text-text-primary rounded-xl cursor-pointer gap-1 text-center">
              <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
              <span className="text-[10px] tracking-tight leading-tight">Home</span>
            </div>
            <div className="flex flex-col items-center justify-center w-full py-3 px-1 hover:bg-surface rounded-xl transition-all cursor-pointer text-text-primary gap-1 text-center mt-1">
              <span className="material-symbols-outlined text-[22px]">play_circle</span>
              <span className="text-[10px] tracking-tight leading-tight">Shorts</span>
            </div>
            <div className="flex flex-col items-center justify-center w-full py-3 px-1 hover:bg-surface rounded-xl transition-all cursor-pointer text-text-primary gap-1 text-center mt-1">
              <span className="material-symbols-outlined text-[22px]">subscriptions</span>
              <span className="text-[10px] tracking-tight leading-tight">Subs</span>
            </div>
          </div>
          <hr className="my-4 border-border-light mx-2" />
          <div className="px-1.5 flex flex-col gap-1 items-center w-full">
            <div className="py-2 text-[9px] font-bold text-neutral-gray uppercase tracking-wider text-center w-full">
              <span>You</span>
            </div>
            <div className="flex flex-col items-center justify-center w-full py-3 px-1 hover:bg-surface rounded-xl transition-all cursor-pointer text-text-primary gap-1 text-center mt-1">
              <span className="material-symbols-outlined text-[22px]">history</span>
              <span className="text-[10px] tracking-tight leading-tight">History</span>
            </div>
            <div className="flex flex-col items-center justify-center w-full py-3 px-1 hover:bg-surface rounded-xl transition-all cursor-pointer text-text-primary gap-1 text-center mt-1">
              <span className="material-symbols-outlined text-[22px]">schedule</span>
              <span className="text-[10px] tracking-tight leading-tight">Later</span>
            </div>
            <div className="flex flex-col items-center justify-center w-full py-3 px-1 hover:bg-surface rounded-xl transition-all cursor-pointer text-text-primary gap-1 text-center mt-1">
              <span className="material-symbols-outlined text-[22px]">thumb_up</span>
              <span className="text-[10px] tracking-tight leading-tight">Liked</span>
            </div>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 md:pl-[80px] bg-background w-full">
          {/* Hero Section */}
          <section className="relative w-full h-[360px] flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 z-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                alt="Hero background" 
                className="w-full h-full object-cover brightness-50" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAMf2jj0QP6xmCktsRYno3DdxAF55cPkx-pP6ZZkqw96UZ1TsNxfyYg6cv3BzstVP2o9NeF2VWLdNZHDFOOuLygKwePyRensX5RaZhHH2owy2nTY_2Sh2KlZ_YM9Xa55iKiTlsnCUuqtnM4iNDPpPKMqXcRjnVayjJafFw4iXs7d3--78nIJ_IDUG45oi__LD7QITIuykul3Kf7Qlrrb6MLq_0-MUsC1ENnoKDjb7PWYFWqakb6J4gmCWdMOg3P6dnCxyJuOS0TIkD7"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
            </div>
            <div className="relative z-10 text-center px-4 w-full max-w-4xl">
              <h1 className="font-heading text-4xl md:text-6xl font-black text-white mb-6 drop-shadow-lg uppercase tracking-tight leading-none">
                Schedule Appointments Instantly
              </h1>
              {/* Central Search Bar */}
              <div className="flex w-full max-w-[720px] mx-auto bg-white rounded-full shadow-2xl overflow-hidden p-1.5 ring-1 ring-white/20">
                <div className="flex-1 flex items-center px-4">
                  <span className="material-symbols-outlined text-neutral-gray mr-3 text-[20px]">search</span>
                  <input 
                    className="w-full border-none focus:ring-0 text-sm py-2 bg-transparent placeholder-neutral-gray/60 outline-none text-text-primary" 
                    placeholder="Find therapists, consultants, or specialists..." 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button className="bg-primary hover:bg-primary-hover text-white font-medium text-xs px-8 rounded-full transition-colors duration-75">
                  SEARCH
                </button>
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <span className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer hover:bg-white/20">Telehealth</span>
                <span className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer hover:bg-white/20">Home Visits</span>
                <span className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer hover:bg-white/20">Corporate</span>
              </div>
            </div>
          </section>

          {/* Chips Row */}
          <div className="sticky top-[56px] z-30 bg-background/95 backdrop-blur-sm py-3 px-6 md:px-8 flex gap-2 overflow-x-auto hide-scrollbar border-b border-border-light/50">
            <button className="whitespace-nowrap px-4 py-1.5 bg-text-primary text-white rounded-xl text-xs font-semibold">All</button>
            <button className="whitespace-nowrap px-4 py-1.5 bg-surface hover:bg-surface-container rounded-xl text-xs font-semibold text-text-primary transition-colors">Healthcare</button>
            <button className="whitespace-nowrap px-4 py-1.5 bg-surface hover:bg-surface-container rounded-xl text-xs font-semibold text-text-primary transition-colors">Consulting</button>
            <button className="whitespace-nowrap px-4 py-1.5 bg-surface hover:bg-surface-container rounded-xl text-xs font-semibold text-text-primary transition-colors">Personal Training</button>
            <button className="whitespace-nowrap px-4 py-1.5 bg-surface hover:bg-surface-container rounded-xl text-xs font-semibold text-text-primary transition-colors">Legal Aid</button>
            <button className="whitespace-nowrap px-4 py-1.5 bg-surface hover:bg-surface-container rounded-xl text-xs font-semibold text-text-primary transition-colors">Education</button>
            <button className="whitespace-nowrap px-4 py-1.5 bg-surface hover:bg-surface-container rounded-xl text-xs font-semibold text-text-primary transition-colors">Tech Support</button>
          </div>

          {/* Provider Grid Section */}
          <div className="p-6 md:p-8 max-w-[2200px] mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="font-heading text-lg font-bold text-text-primary">Available Providers</h2>
              <span className="text-xs text-neutral-gray font-medium">
                Showing {filteredOrgs.length} of {orgs.length} total
              </span>
            </div>

            {filteredOrgs.length === 0 ? (
              <div className="text-center py-16 border border-border-light rounded-2xl bg-white space-y-3">
                <span className="material-symbols-outlined text-[48px] text-neutral-gray/50">search</span>
                <p className="font-bold text-neutral-gray">No providers found</p>
                <p className="text-xs text-neutral-gray/70">
                  Try searching for something else, or check back later!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
                {filteredOrgs.map((page) => {
                  const formattedPrice = page.price ? `$${Number(page.price)} ${page.currency}` : "Free"
                  const media = getProviderMedia(page.title, page.org.name)
                  const brandColor = page.org.tier === "PRO" ? page.brandColor : null

                  return (
                    <div 
                      key={page.id} 
                      className="flex flex-col gap-3 group cursor-pointer"
                      onClick={() => setSelectedPage(page)}
                    >
                      <div 
                        className="relative aspect-video rounded-xl overflow-hidden bg-surface group-hover:rounded-none transition-all duration-300 border border-border-light"
                        style={brandColor ? { borderTop: `4px solid ${brandColor}` } : undefined}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                          alt={page.title}
                          src={media.thumbnail}
                        />
                        <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-semibold px-1.5 rounded-sm">
                          {page.duration} mins
                        </span>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                          <div className="bg-primary text-white p-3 rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
                            <span className="material-symbols-outlined text-[28px] block" style={{ fontVariationSettings: "'FILL' 1" }}>
                              event_available
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-9 h-9 rounded-full overflow-hidden border border-border-light bg-surface">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img alt={page.org.name} className="w-full h-full object-cover" src={media.avatar} />
                          </div>
                        </div>
                        <div className="flex flex-col flex-1 overflow-hidden gap-0.5">
                          <h3 className="text-xs font-semibold text-text-primary line-clamp-2 leading-tight">
                            {page.title}
                          </h3>
                          <div className="text-[10px] text-neutral-gray mt-0.5">
                            <p className="hover:text-text-primary font-medium flex items-center gap-1">
                              {page.org.name}
                              <span className="material-symbols-outlined text-[13px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            </p>
                            {page.description && (
                              <p className="line-clamp-2 text-neutral-gray mt-1 leading-normal text-[10px]">
                                {page.description}
                              </p>
                            )}
                            <div className="flex items-center justify-between mt-3 pt-2 border-t border-border-light/60">
                              <span className="text-primary text-xs font-black">{formattedPrice}</span>
                              <span className="bg-text-primary hover:bg-neutral-gray text-white text-[10px] font-bold px-3 py-1 rounded-full transition-colors">
                                Book Now
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          
          {/* Footer */}
          <footer className="mt-16 py-8 border-t border-border-light flex flex-col items-center gap-4 text-center bg-surface-container-low/40">
            <div className="flex items-center gap-2">
              <span className="font-heading text-lg font-black text-primary tracking-tighter">StreamTube</span>
              <p className="text-neutral-gray text-[10px]">© {new Date().getFullYear()} BooklyFlow. All rights reserved.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-neutral-gray text-[10px] font-semibold">
              <a className="hover:text-text-primary" href="#">About</a>
              <a className="hover:text-text-primary" href="#">Press</a>
              <a className="hover:text-text-primary" href="#">Copyright</a>
              <a className="hover:text-text-primary" href="#">Contact us</a>
              <a className="hover:text-text-primary" href="#">Creators</a>
              <a className="hover:text-text-primary" href="#">Advertise</a>
              <a className="hover:text-text-primary" href="#">Developers</a>
            </div>
            <div className="flex gap-6 text-neutral-gray text-[10px] font-semibold">
              <a className="hover:text-text-primary font-bold" href="#">Privacy Policy &amp; Safety</a>
              <a className="hover:text-text-primary" href="#">How StreamTube works</a>
              <a className="hover:text-text-primary" href="#">Test new features</a>
            </div>
          </footer>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full h-[56px] bg-background border-t border-border-light flex justify-around items-center z-50">
        <div className="flex flex-col items-center justify-center text-text-primary">
          <span className="material-symbols-outlined text-[22px]">home</span>
          <span className="text-[10px] font-medium mt-0.5">Home</span>
        </div>
        <div className="flex flex-col items-center justify-center text-neutral-gray">
          <span className="material-symbols-outlined text-[22px]">play_circle</span>
          <span className="text-[10px] font-medium mt-0.5">Shorts</span>
        </div>
        <div className="flex flex-col items-center justify-center text-neutral-gray">
          <span className="material-symbols-outlined text-[22px]">subscriptions</span>
          <span className="text-[10px] font-medium mt-0.5">Subs</span>
        </div>
      </nav>

      {/* Booking Modal */}
      <ClientBookingModal
        page={selectedPage}
        isOpen={!!selectedPage}
        onClose={() => setSelectedPage(null)}
      />
    </div>
  )
}
