describe('Note CRUD', () => {
  beforeEach(() => {
    // Reset IndexedDB between tests
    indexedDB.deleteDatabase('knowledge-manager')
    cy.visit('/')
  })

  it('displays the homepage with header', () => {
    cy.contains('h1', '知识库').should('be.visible')
    cy.contains('button', '新建笔记').should('be.visible')
  })

  it('creates a new note via modal', () => {
    cy.contains('button', '新建笔记').click()
    cy.get('.modal-overlay').should('be.visible')

    // Fill title
    cy.get('.modal-title-input').type('Cypress Test Note')
    // Fill summary
    cy.get('.summary-textarea').type('This is a test summary for the note')
    // Fill keywords (type + Enter)
    cy.get('.chip-input-row .chip-input').first().type('testing, e2e{enter}')
    // Fill tags
    cy.get('.chip-input-row .chip-input').last().type('test-tag{enter}')
    // Type content in the editor
    cy.get('.tiptap').type('Hello from Cypress!')

    // Save
    cy.contains('button', '保存').click()

    // Modal closes, note appears in list
    cy.get('.modal-overlay').should('not.exist')
    cy.contains('Cypress Test Note').should('be.visible')
  })

  it('deletes a note', () => {
    // Create note first
    cy.contains('button', '新建笔记').click()
    cy.get('.modal-title-input').type('Delete Me')
    cy.get('.tiptap').type('Will be gone')
    cy.contains('button', '保存').click()

    // Delete it
    cy.contains('Delete Me').should('be.visible')
    cy.contains('🗑️ 删除').click()
    cy.on('window:confirm', () => true)

    cy.contains('Delete Me').should('not.exist')
  })
})
