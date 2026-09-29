import { useState } from 'react'
import styles from './FilterChips.module.css'

interface Props {
  legend: string
  options: string[]
  selected: string[]
  onToggle: (option: string) => void
  /**
   * For a long list: what the options are called, such as "types". The list
   * is then tucked away behind a button, with only the chosen ones in view.
   */
  tuckedAway?: string
}

export function FilterChips({
  legend,
  options,
  selected,
  onToggle,
  tuckedAway,
}: Props) {
  const [open, setOpen] = useState(false)
  const shown =
    tuckedAway && !open
      ? options.filter((option) => selected.includes(option))
      : options

  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>
        {legend}
        {selected.length > 0 && (
          <span className={styles.count}> · {selected.join(', ')}</span>
        )}
      </legend>
      {shown.length > 0 && (
        <>
          {/* Shown only at widths where the row scrolls. */}
          <p className={styles.hint}>Scroll sideways for more</p>
          <ul className={styles.chips}>
            {shown.map((option) => {
              const on = selected.includes(option)
              return (
                <li key={option}>
                  <button
                    type="button"
                    className={on ? `${styles.chip} ${styles.on}` : styles.chip}
                    aria-pressed={on}
                    onClick={() => onToggle(option)}
                  >
                    {option}
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
      {tuckedAway && (
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open
            ? `Show fewer ${tuckedAway}`
            : `Show all ${options.length} ${tuckedAway}`}
        </button>
      )}
    </fieldset>
  )
}
