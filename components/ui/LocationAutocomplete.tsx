'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Search, MapPin, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import axios from 'axios'

interface Location {
    name: string
    coords: {
        latitude: number
        longitude: number
    }
}

interface NominatimSuggestion {
    place_id: number
    display_name: string
    name?: string
    lat: string
    lon: string
    type?: string
}

interface LocationAutocompleteProps {
    value: string
    onSelect: (location: Location) => void
    placeholder?: string
    className?: string
    icon?: React.ReactNode
}

export function LocationAutocomplete({
    value,
    onSelect,
    placeholder = "Search location...",
    className,
    icon
}: LocationAutocompleteProps) {
    const [inputValue, setInputValue] = useState(value)
    const [suggestions, setSuggestions] = useState<NominatimSuggestion[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        setInputValue(value)
    }, [value])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [])

    const fetchSuggestions = async (query: string) => {
        if (!query || query.length < 3) {
            setSuggestions([])
            return
        }

        setIsLoading(true)
        try {
            const response = await axios.get(
                'https://nominatim.openstreetmap.org/search',
                {
                    params: {
                        q: query,
                        format: 'jsonv2',
                        addressdetails: 1,
                        limit: 5,
                        countrycodes: 'ng',
                    }
                }
            )
            setSuggestions(response.data || [])
            setIsOpen(true)
        } catch (error) {
            console.error('Error fetching OpenStreetMap suggestions:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setInputValue(val)

        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
            fetchSuggestions(val)
        }, 500)
    }

    const handleSelect = (feature: NominatimSuggestion) => {
        const latitude = Number(feature.lat)
        const longitude = Number(feature.lon)
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return

        const location: Location = {
            name: feature.display_name,
            coords: {
                longitude,
                latitude,
            }
        }
        setInputValue(feature.display_name)
        setSuggestions([])
        setIsOpen(false)
        onSelect(location)
    }

    const clearInput = () => {
        setInputValue('')
        setSuggestions([])
        setIsOpen(false)
    }

    return (
        <div className={cn("relative w-full", className)} ref={containerRef}>
            <div className="relative">
                {icon ? (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        {icon}
                    </div>
                ) : (
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                )}

                <Input
                    className={cn(
                        "h-12 w-full",
                        icon || true ? "pl-10" : "pl-4",
                        "pr-10"
                    )}
                    placeholder={placeholder}
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={() => suggestions.length > 0 && setIsOpen(true)}
                />

                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                    {inputValue && (
                        <button
                            onClick={clearInput}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {isOpen && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="max-h-[300px] overflow-y-auto overflow-x-hidden p-1">
                        {suggestions.map((feature) => (
                            <button
                                key={feature.place_id}
                                onClick={() => handleSelect(feature)}
                                className="w-full flex items-start gap-3 p-3 hover:bg-slate-50 transition-colors rounded-lg text-left group"
                            >
                                <div className="mt-1 h-7 w-7 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                                    <MapPin className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-900 truncate">
                                        {feature.name || feature.display_name.split(',')[0]}
                                    </p>
                                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                                        {feature.display_name}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className="p-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Powered by OpenStreetMap</span>
                    </div>
                </div>
            )}
        </div>
    )
}
