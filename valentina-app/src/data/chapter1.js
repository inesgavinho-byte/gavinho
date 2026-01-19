/**
 * Chapter 1: Life Cycles of Flowering Plants
 * Cambridge Primary Science 5
 *
 * Content structured for bilingual PT/EN display
 */

export const chapter1 = {
  id: 'chapter-1',
  title: {
    pt: 'Ciclos de Vida das Plantas com Flor',
    en: 'Life Cycles of Flowering Plants'
  },
  subtitle: 'Cambridge Primary Science 5',

  sections: [
    // Section 1.1: Flowering and Non-flowering Plants
    {
      id: '1.1',
      title: {
        pt: 'Plantas com flor e sem flor',
        en: 'Flowering and non-flowering plants'
      },
      exercises: [
        // Exercise 1: Classify plants
        {
          id: '1.1.1',
          type: 'classify',
          instruction: {
            pt: 'Classifica cada planta como "com flor" ou "sem flor"',
            en: 'Classify each plant as "flowering" or "non-flowering"'
          },
          categories: [
            { id: 'flowering', pt: 'Com flor', en: 'Flowering' },
            { id: 'non-flowering', pt: 'Sem flor', en: 'Non-flowering' }
          ],
          items: [
            { id: 'fern', name: { pt: 'Feto', en: 'Fern' }, emoji: '🌿', correctCategory: 'non-flowering' },
            { id: 'moss', name: { pt: 'Musgo', en: 'Moss' }, emoji: '🪴', correctCategory: 'non-flowering' },
            { id: 'mango', name: { pt: 'Mangueira', en: 'Mango tree' }, emoji: '🥭', correctCategory: 'flowering' },
            { id: 'lily', name: { pt: 'Lírio', en: 'Lily' }, emoji: '🌷', correctCategory: 'flowering' },
            { id: 'rose', name: { pt: 'Rosa', en: 'Rose' }, emoji: '🌹', correctCategory: 'flowering' },
            { id: 'sunflower', name: { pt: 'Girassol', en: 'Sunflower' }, emoji: '🌻', correctCategory: 'flowering' }
          ]
        },
        // Exercise 2: Plant life cycle
        {
          id: '1.1.2',
          type: 'cycle',
          instruction: {
            pt: 'Ordena as etapas do ciclo de vida de uma planta com flor',
            en: 'Order the stages of a flowering plant life cycle'
          },
          cycleTitle: {
            pt: 'Ciclo de Vida',
            en: 'Life Cycle'
          },
          stages: [
            { id: 1, name: { pt: 'Semente', en: 'Seed' }, emoji: '🫘' },
            { id: 2, name: { pt: 'Germinação', en: 'Germination' }, emoji: '🌱' },
            { id: 3, name: { pt: 'Plântula', en: 'Seedling' }, emoji: '🌿' },
            { id: 4, name: { pt: 'Planta adulta', en: 'Adult plant' }, emoji: '🪴' },
            { id: 5, name: { pt: 'Flor', en: 'Flower' }, emoji: '🌸' },
            { id: 6, name: { pt: 'Fruto e semente', en: 'Fruit and seed' }, emoji: '🍎' }
          ]
        },
        // Exercise 3: Match terms
        {
          id: '1.1.3',
          type: 'match',
          instruction: {
            pt: 'Liga cada termo à sua definição',
            en: 'Match each term to its definition'
          },
          pairs: [
            {
              left: {
                id: 'flowering',
                emoji: '🌸',
                text: { pt: 'Planta com flor', en: 'Flowering plant' }
              },
              right: {
                id: 'flowering-def',
                text: {
                  pt: 'Produz sementes dentro de frutos',
                  en: 'Produces seeds inside fruits'
                }
              }
            },
            {
              left: {
                id: 'non-flowering',
                emoji: '🌿',
                text: { pt: 'Planta sem flor', en: 'Non-flowering plant' }
              },
              right: {
                id: 'non-flowering-def',
                text: {
                  pt: 'Reproduz-se por esporos ou outras formas',
                  en: 'Reproduces by spores or other means'
                }
              }
            },
            {
              left: {
                id: 'seed',
                emoji: '🫘',
                text: { pt: 'Semente', en: 'Seed' }
              },
              right: {
                id: 'seed-def',
                text: {
                  pt: 'Contém um embrião e reservas de alimento',
                  en: 'Contains an embryo and food reserves'
                }
              }
            },
            {
              left: {
                id: 'fruit',
                emoji: '🍎',
                text: { pt: 'Fruto', en: 'Fruit' }
              },
              right: {
                id: 'fruit-def',
                text: {
                  pt: 'Estrutura que protege e dispersa as sementes',
                  en: 'Structure that protects and disperses seeds'
                }
              }
            }
          ]
        }
      ]
    },

    // Section 1.2: Pollination
    {
      id: '1.2',
      title: {
        pt: 'Polinização',
        en: 'Pollination'
      },
      exercises: [
        // Exercise 1: Fill in the blanks
        {
          id: '1.2.1',
          type: 'fill-blank',
          instruction: {
            pt: 'Completa as frases sobre polinização',
            en: 'Complete the sentences about pollination'
          },
          wordBank: ['pólen', 'abelhas', 'vento', 'estigma', 'estame'],
          sentences: [
            {
              id: 1,
              template: 'A polinização acontece quando o [blank:1] viaja do [blank:2] até ao [blank:3].',
              translation: 'Pollination happens when pollen travels from the stamen to the stigma.',
              blanks: [
                { id: 1, correct: 'pólen' },
                { id: 2, correct: 'estame' },
                { id: 3, correct: 'estigma' }
              ]
            },
            {
              id: 2,
              template: 'Os insetos como as [blank:1] ajudam na polinização.',
              translation: 'Insects like bees help with pollination.',
              blanks: [
                { id: 1, correct: 'abelhas' }
              ]
            },
            {
              id: 3,
              template: 'Algumas plantas são polinizadas pelo [blank:1].',
              translation: 'Some plants are pollinated by the wind.',
              blanks: [
                { id: 1, correct: 'vento' }
              ]
            }
          ]
        },
        // Exercise 2: Quiz about pollination
        {
          id: '1.2.2',
          type: 'quiz',
          instruction: {
            pt: 'Responde à pergunta sobre polinização',
            en: 'Answer the question about pollination'
          },
          question: {
            pt: 'Qual é a função principal da polinização?',
            en: 'What is the main function of pollination?'
          },
          options: [
            {
              id: 'a',
              text: { pt: 'Produzir oxigénio', en: 'Produce oxygen' },
              correct: false
            },
            {
              id: 'b',
              text: { pt: 'Permitir a reprodução das plantas', en: 'Allow plant reproduction' },
              correct: true
            },
            {
              id: 'c',
              text: { pt: 'Fazer fotossíntese', en: 'Perform photosynthesis' },
              correct: false
            },
            {
              id: 'd',
              text: { pt: 'Absorver água', en: 'Absorb water' },
              correct: false
            }
          ]
        },
        // Exercise 3: Match pollinators
        {
          id: '1.2.3',
          type: 'match',
          instruction: {
            pt: 'Liga cada tipo de polinização ao seu agente',
            en: 'Match each type of pollination to its agent'
          },
          pairs: [
            {
              left: {
                id: 'bee-poll',
                emoji: '🐝',
                text: { pt: 'Polinização por insetos', en: 'Insect pollination' }
              },
              right: {
                id: 'bee-desc',
                text: {
                  pt: 'Flores coloridas e com néctar',
                  en: 'Colorful flowers with nectar'
                }
              }
            },
            {
              left: {
                id: 'wind-poll',
                emoji: '💨',
                text: { pt: 'Polinização pelo vento', en: 'Wind pollination' }
              },
              right: {
                id: 'wind-desc',
                text: {
                  pt: 'Flores pequenas e muito pólen leve',
                  en: 'Small flowers and lots of light pollen'
                }
              }
            },
            {
              left: {
                id: 'bird-poll',
                emoji: '🐦',
                text: { pt: 'Polinização por aves', en: 'Bird pollination' }
              },
              right: {
                id: 'bird-desc',
                text: {
                  pt: 'Flores tubulares e vermelhas',
                  en: 'Tubular red flowers'
                }
              }
            }
          ]
        }
      ]
    },

    // Section 1.3: Seed Dispersal
    {
      id: '1.3',
      title: {
        pt: 'Dispersão de sementes',
        en: 'Seed dispersal'
      },
      exercises: [
        // Exercise 1: Classify dispersal methods
        {
          id: '1.3.1',
          type: 'classify',
          instruction: {
            pt: 'Classifica cada planta pelo seu método de dispersão de sementes',
            en: 'Classify each plant by its seed dispersal method'
          },
          categories: [
            { id: 'wind', pt: 'Vento', en: 'Wind' },
            { id: 'animal', pt: 'Animais', en: 'Animals' },
            { id: 'water', pt: 'Água', en: 'Water' }
          ],
          items: [
            { id: 'dandelion', name: { pt: 'Dente-de-leão', en: 'Dandelion' }, emoji: '🌬️', correctCategory: 'wind' },
            { id: 'maple', name: { pt: 'Bordo', en: 'Maple' }, emoji: '🍁', correctCategory: 'wind' },
            { id: 'berry', name: { pt: 'Bagas', en: 'Berries' }, emoji: '🫐', correctCategory: 'animal' },
            { id: 'acorn', name: { pt: 'Bolota', en: 'Acorn' }, emoji: '🌰', correctCategory: 'animal' },
            { id: 'coconut', name: { pt: 'Coco', en: 'Coconut' }, emoji: '🥥', correctCategory: 'water' },
            { id: 'lotus', name: { pt: 'Lótus', en: 'Lotus' }, emoji: '🪷', correctCategory: 'water' }
          ]
        },
        // Exercise 2: Sequence - How wind dispersal works
        {
          id: '1.3.2',
          type: 'sequence',
          instruction: {
            pt: 'Ordena os passos da dispersão pelo vento',
            en: 'Order the steps of wind dispersal'
          },
          steps: [
            { id: 1, text: { pt: 'A planta produz sementes leves', en: 'The plant produces light seeds' }, emoji: '🌱' },
            { id: 2, text: { pt: 'O vento sopra as sementes', en: 'The wind blows the seeds' }, emoji: '💨' },
            { id: 3, text: { pt: 'As sementes voam para longe', en: 'The seeds fly far away' }, emoji: '🌬️' },
            { id: 4, text: { pt: 'As sementes caem no solo', en: 'The seeds fall to the ground' }, emoji: '⬇️' },
            { id: 5, text: { pt: 'Uma nova planta cresce', en: 'A new plant grows' }, emoji: '🌿' }
          ]
        },
        // Exercise 3: Quiz with data
        {
          id: '1.3.3',
          type: 'quiz',
          instruction: {
            pt: 'Analisa os dados e responde',
            en: 'Analyze the data and answer'
          },
          dataTable: {
            headers: [
              { pt: 'Método', en: 'Method' },
              { pt: 'Distância média', en: 'Average distance' }
            ],
            rows: [
              ['Vento (Wind)', '100 metros'],
              ['Animais (Animals)', '500 metros'],
              ['Água (Water)', '1000 metros']
            ]
          },
          question: {
            pt: 'Qual método dispersa sementes para mais longe?',
            en: 'Which method disperses seeds the farthest?'
          },
          options: [
            {
              id: 'a',
              text: { pt: 'Vento', en: 'Wind' },
              correct: false
            },
            {
              id: 'b',
              text: { pt: 'Animais', en: 'Animals' },
              correct: false
            },
            {
              id: 'c',
              text: { pt: 'Água', en: 'Water' },
              correct: true
            }
          ]
        }
      ]
    },

    // Section 1.4: Germination
    {
      id: '1.4',
      title: {
        pt: 'Germinação',
        en: 'Germination'
      },
      exercises: [
        // Exercise 1: Sequence - Germination steps
        {
          id: '1.4.1',
          type: 'sequence',
          instruction: {
            pt: 'Ordena os passos da germinação de uma semente',
            en: 'Order the steps of seed germination'
          },
          steps: [
            { id: 1, text: { pt: 'A semente absorve água', en: 'The seed absorbs water' }, emoji: '💧' },
            { id: 2, text: { pt: 'A casca da semente abre', en: 'The seed coat opens' }, emoji: '🫘' },
            { id: 3, text: { pt: 'A raiz emerge primeiro', en: 'The root emerges first' }, emoji: '🌱' },
            { id: 4, text: { pt: 'O caule cresce para cima', en: 'The stem grows upward' }, emoji: '🌿' },
            { id: 5, text: { pt: 'As primeiras folhas aparecem', en: 'The first leaves appear' }, emoji: '🍃' }
          ]
        },
        // Exercise 2: Fill blanks about germination needs
        {
          id: '1.4.2',
          type: 'fill-blank',
          instruction: {
            pt: 'Completa as frases sobre o que as sementes precisam para germinar',
            en: 'Complete the sentences about what seeds need to germinate'
          },
          wordBank: ['água', 'oxigénio', 'temperatura', 'luz', 'solo'],
          sentences: [
            {
              id: 1,
              template: 'As sementes precisam de [blank:1] para começar a germinar.',
              translation: 'Seeds need water to start germinating.',
              blanks: [
                { id: 1, correct: 'água' }
              ]
            },
            {
              id: 2,
              template: 'A [blank:1] adequada é importante para a germinação.',
              translation: 'The right temperature is important for germination.',
              blanks: [
                { id: 1, correct: 'temperatura' }
              ]
            },
            {
              id: 3,
              template: 'As sementes também precisam de [blank:1] para respirar.',
              translation: 'Seeds also need oxygen to breathe.',
              blanks: [
                { id: 1, correct: 'oxigénio' }
              ]
            }
          ]
        },
        // Exercise 3: Quiz about germination
        {
          id: '1.4.3',
          type: 'quiz',
          instruction: {
            pt: 'Responde à pergunta sobre germinação',
            en: 'Answer the question about germination'
          },
          question: {
            pt: 'Qual parte da planta emerge primeiro durante a germinação?',
            en: 'Which part of the plant emerges first during germination?'
          },
          options: [
            {
              id: 'a',
              text: { pt: 'As folhas', en: 'The leaves' },
              correct: false
            },
            {
              id: 'b',
              text: { pt: 'A flor', en: 'The flower' },
              correct: false
            },
            {
              id: 'c',
              text: { pt: 'A raiz', en: 'The root' },
              correct: true
            },
            {
              id: 'd',
              text: { pt: 'O fruto', en: 'The fruit' },
              correct: false
            }
          ]
        }
      ]
    }
  ]
}

// Helper to count total exercises
export function getTotalExercises(chapter) {
  return chapter.sections.reduce((sum, section) => sum + section.exercises.length, 0)
}

// Helper to get flat list of all exercises
export function getAllExercises(chapter) {
  return chapter.sections.flatMap(section =>
    section.exercises.map(exercise => ({
      ...exercise,
      sectionId: section.id,
      sectionTitle: section.title
    }))
  )
}

// Helper to find exercise by index
export function getExerciseByIndex(chapter, index) {
  const allExercises = getAllExercises(chapter)
  return allExercises[index] || null
}
