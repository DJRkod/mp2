import styles from './FilterChips.module.css'

interface Props {
  legend: string
  options: string[]
  selected: string[]
  onToggle: (option: string) => void
}

export function FilterChips({ legend, options, selected, onToggle }: Props) {
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>
        {legend}
        {selected.length > 0 && (
          <span className={styles.count}> · {selected.join(', ')}</span>
        )}
      </legend>
      <ul className={styles.chips}>
        {options.map((option) => {
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
    </fieldset>
  )
}
