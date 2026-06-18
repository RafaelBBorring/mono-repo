import React from 'react'

const variants = {
  primary: 'bg-gradient-to-r from-ocean-500 to-ocean-600 text-white hover:shadow-ocean-500/40 hover:-translate-y-0.5',
  sunset: 'bg-gradient-to-r from-sunset-500 to-sunset-600 text-white hover:shadow-sunset-500/40 hover:-translate-y-0.5',
  ghost: 'bg-transparent text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-slate-700',
  outline: 'bg-transparent text-ocean-400 border border-ocean-500/50 hover:bg-ocean-500/10',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-5 py-2.5 rounded-xl',
  lg: 'px-8 py-3.5 text-lg rounded-xl',
}

export default function Button({ variant = 'primary', size = 'md', children, className = '', ...props }) {
  return (
    <button
      className={`font-semibold transition-all duration-200 active:scale-[0.97] shadow-lg ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
