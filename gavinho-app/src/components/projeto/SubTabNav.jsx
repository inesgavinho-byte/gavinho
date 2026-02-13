import styles from '../../pages/ProjetoDetalhe.module.css'

export default function SubTabNav({ sections, activeSection, onSectionChange }) {
  return (
    <div className={styles.subTabNav}>
      {sections.map(section => (
        <button
          key={section.id}
          onClick={() => onSectionChange(section.id)}
          className={activeSection === section.id ? styles.subTabActive : styles.subTab}
        >
          <section.icon size={14} />
          {section.label}
        </button>
      ))}
    </div>
  )
}
