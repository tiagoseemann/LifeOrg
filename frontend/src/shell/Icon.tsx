interface IconProps {
  id: string
  size?: number
  className?: string
  'aria-label'?: string
}

export function Icon({ id, size = 20, className, 'aria-label': ariaLabel }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      focusable="false"
    >
      <use href={`#i-${id}`} />
    </svg>
  )
}
