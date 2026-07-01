describe('Search and Filter', () => {
  beforeEach(() => {
    indexedDB.deleteDatabase('knowledge-manager')
    cy.visit('/')
  })

  function createNote(title: string, tags: string[]) {
    cy.contains('button', '新建笔记').click()
    cy.get('.modal-title-input').type(title)
    if (tags.length > 0) {
      cy.get('.chip-input-row .chip-input').last().type(`${tags.join(', ')}{enter}`)
    }
    cy.get('.tiptap').type(`Content of ${title}`)
    cy.contains('button', '保存').click()
    cy.get('.modal-overlay').should('not.exist')
  }

  it('searches notes by keyword', () => {
    createNote('Vue.js Guide', ['frontend'])
    createNote('React Hooks', ['frontend'])
    createNote('Python Basics', ['backend'])

    cy.get('.search-input').type('vue')
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(500) // debounce

    cy.contains('Vue.js Guide').should('be.visible')
    cy.contains('React Hooks').should('not.exist')
    cy.contains('Python Basics').should('not.exist')
  })

  it('filters by tag', () => {
    createNote('Vue.js Guide', ['frontend'])
    createNote('Python Basics', ['backend'])

    cy.contains('.tag-filter-pill', 'frontend').click()

    cy.contains('Vue.js Guide').should('be.visible')
    cy.contains('Python Basics').should('not.exist')
  })

  it('clears all filters', () => {
    createNote('Vue.js Guide', ['frontend'])
    createNote('Python Basics', ['backend'])

    cy.get('.search-input').type('vue')
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(500)

    cy.contains('Vue.js Guide').should('be.visible')
    cy.contains('Python Basics').should('not.exist')

    // Clear filters
    cy.contains('清除全部').click()
    cy.contains('Vue.js Guide').should('be.visible')
    cy.contains('Python Basics').should('be.visible')
  })
})
