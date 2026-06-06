"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, Copy } from "lucide-react"

type Props = {
  text: string
  label?: string
  className?: string
}

export function CopyButton({ text, label = "Copy Link", className }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      const resolvedText = text.startsWith("/")
        ? window.location.origin + text
        : text
      await navigator.clipboard.writeText(resolvedText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className={`gap-1.5 h-8 font-medium ${className}`}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-green-600 animate-in fade-in zoom-in duration-200" />
          <span>Copied</span>
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          <span>{label}</span>
        </>
      )}
    </Button>
  )
}
