import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, Check, X, ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAddExample, useDeleteExample, useUpdateExample } from '@/hooks/useVocabulary'
import type { WordExample } from '@/types'

const exampleSchema = z.object({
  engSentence: z.string().min(1, 'English sentence is required'),
  perTranslation: z.string().min(1, 'Persian translation is required'),
})

type ExampleFormValues = z.infer<typeof exampleSchema>

// Draft example used when creating a new word (no wordId yet)
export interface DraftExample {
  tempId: string
  engSentence: string
  perTranslation: string
  order: number
}

interface ExampleManagerProps {
  // Pass wordId when editing an existing word; omit when creating a new word
  wordId?: string
  // Used in create mode: controlled list managed by parent
  draftExamples?: DraftExample[]
  onDraftChange?: (examples: DraftExample[]) => void
  // Used in edit mode: existing persisted examples
  existingExamples?: WordExample[]
  onExamplesChange?: () => void
}

function ExampleForm({
  defaultValues,
  onSave,
  onCancel,
  isSaving,
}: {
  defaultValues?: ExampleFormValues
  onSave: (values: ExampleFormValues) => void
  onCancel: () => void
  isSaving?: boolean
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ExampleFormValues>({
    resolver: zodResolver(exampleSchema),
    defaultValues: defaultValues ?? { engSentence: '', perTranslation: '' },
  })

  return (
    <form
      onSubmit={handleSubmit(onSave)}
      className="border border-border rounded-md p-3 space-y-3 bg-muted/30"
    >
      <div className="space-y-1">
        <Label htmlFor="engSentence">English Sentence</Label>
        <Input
          id="engSentence"
          placeholder="Enter English sentence..."
          {...register('engSentence')}
        />
        {errors.engSentence && (
          <p className="text-xs text-destructive">{errors.engSentence.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="perTranslation">Persian Translation</Label>
        <Input
          id="perTranslation"
          placeholder="Enter Persian translation..."
          dir="rtl"
          {...register('perTranslation')}
        />
        {errors.perTranslation && (
          <p className="text-xs text-destructive">{errors.perTranslation.message}</p>
        )}
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSaving}>
          <Check className="h-4 w-4 mr-1" />
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  )
}

export function ExampleManager({
  wordId,
  draftExamples = [],
  onDraftChange,
  existingExamples = [],
  onExamplesChange,
}: ExampleManagerProps) {
  const isEditMode = Boolean(wordId)

  const addExampleMutation = useAddExample()
  const deleteExampleMutation = useDeleteExample()
  const updateExampleMutation = useUpdateExample()

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingExampleId, setEditingExampleId] = useState<string | null>(null)

  // --- Draft mode (create new word) ---

  function handleAddDraft(values: ExampleFormValues) {
    if (!onDraftChange) return
    const newExample: DraftExample = {
      tempId: crypto.randomUUID(),
      engSentence: values.engSentence,
      perTranslation: values.perTranslation,
      order: draftExamples.length,
    }
    onDraftChange([...draftExamples, newExample])
    setShowAddForm(false)
  }

  function handleDeleteDraft(tempId: string) {
    if (!onDraftChange) return
    const updated = draftExamples
      .filter((e) => e.tempId !== tempId)
      .map((e, i) => ({ ...e, order: i }))
    onDraftChange(updated)
  }

  function handleEditDraft(tempId: string, values: ExampleFormValues) {
    if (!onDraftChange) return
    const updated = draftExamples.map((e) =>
      e.tempId === tempId ? { ...e, ...values } : e,
    )
    onDraftChange(updated)
    setEditingExampleId(null)
  }

  function moveDraft(tempId: string, direction: 'up' | 'down') {
    if (!onDraftChange) return
    const idx = draftExamples.findIndex((e) => e.tempId === tempId)
    if (idx === -1) return
    const newList = [...draftExamples]
    const swapWith = direction === 'up' ? idx - 1 : idx + 1
    if (swapWith < 0 || swapWith >= newList.length) return
    ;[newList[idx], newList[swapWith]] = [newList[swapWith], newList[idx]]
    onDraftChange(newList.map((e, i) => ({ ...e, order: i })))
  }

  // --- Edit mode (existing word) ---

  async function handleAddExisting(values: ExampleFormValues) {
    if (!wordId) return
    await addExampleMutation.mutateAsync({
      wordId,
      data: {
        engSentence: values.engSentence,
        perTranslation: values.perTranslation,
        order: existingExamples.length,
      },
    })
    setShowAddForm(false)
    onExamplesChange?.()
  }

  async function handleDeleteExisting(exampleId: string) {
    if (!wordId) return
    await deleteExampleMutation.mutateAsync({ wordId, exampleId })
    onExamplesChange?.()
  }

  async function handleEditExisting(exampleId: string, values: ExampleFormValues) {
    if (!wordId) return
    await updateExampleMutation.mutateAsync({ wordId, exampleId, data: values })
    setEditingExampleId(null)
    onExamplesChange?.()
  }

  async function moveExisting(exampleId: string, direction: 'up' | 'down') {
    if (!wordId) return
    const sorted = [...existingExamples].sort((a, b) => a.order - b.order)
    const idx = sorted.findIndex((e) => e.id === exampleId)
    if (idx === -1) return
    const swapWith = direction === 'up' ? idx - 1 : idx + 1
    if (swapWith < 0 || swapWith >= sorted.length) return

    const targetExample = sorted[idx]
    const swapExample = sorted[swapWith]

    await Promise.all([
      updateExampleMutation.mutateAsync({
        wordId,
        exampleId: targetExample.id,
        data: { order: swapExample.order },
      }),
      updateExampleMutation.mutateAsync({
        wordId,
        exampleId: swapExample.id,
        data: { order: targetExample.order },
      }),
    ])
    onExamplesChange?.()
  }

  const isMutating =
    addExampleMutation.isPending ||
    deleteExampleMutation.isPending ||
    updateExampleMutation.isPending

  if (isEditMode) {
    const sorted = [...existingExamples].sort((a, b) => a.order - b.order)

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Examples ({sorted.length})
          </h3>
          {!showAddForm && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(true)}
              disabled={isMutating}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Example
            </Button>
          )}
        </div>

        {sorted.length === 0 && !showAddForm && (
          <p className="text-sm text-muted-foreground italic">No examples yet.</p>
        )}

        <div className="space-y-2">
          {sorted.map((example, idx) =>
            editingExampleId === example.id ? (
              <ExampleForm
                key={example.id}
                defaultValues={{
                  engSentence: example.engSentence,
                  perTranslation: example.perTranslation,
                }}
                onSave={(values) => handleEditExisting(example.id, values)}
                onCancel={() => setEditingExampleId(null)}
                isSaving={isMutating}
              />
            ) : (
              <div
                key={example.id}
                className="flex items-start gap-2 border border-border rounded-md p-3 bg-card"
              >
                <div className="flex flex-col gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={idx === 0 || isMutating}
                    onClick={() => moveExisting(example.id, 'up')}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={idx === sorted.length - 1 || isMutating}
                    onClick={() => moveExisting(example.id, 'down')}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{example.engSentence}</p>
                  <p className="text-sm text-muted-foreground mt-0.5" dir="rtl">
                    {example.perTranslation}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={isMutating}
                    onClick={() => setEditingExampleId(example.id)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    disabled={isMutating}
                    onClick={() => handleDeleteExisting(example.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ),
          )}

          {showAddForm && (
            <ExampleForm
              onSave={handleAddExisting}
              onCancel={() => setShowAddForm(false)}
              isSaving={isMutating}
            />
          )}
        </div>
      </div>
    )
  }

  // Draft mode (new word)
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Examples ({draftExamples.length})
        </h3>
        {!showAddForm && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Example
          </Button>
        )}
      </div>

      {draftExamples.length === 0 && !showAddForm && (
        <p className="text-sm text-muted-foreground italic">No examples yet.</p>
      )}

      <div className="space-y-2">
        {draftExamples.map((example, idx) =>
          editingExampleId === example.tempId ? (
            <ExampleForm
              key={example.tempId}
              defaultValues={{
                engSentence: example.engSentence,
                perTranslation: example.perTranslation,
              }}
              onSave={(values) => handleEditDraft(example.tempId, values)}
              onCancel={() => setEditingExampleId(null)}
            />
          ) : (
            <div
              key={example.tempId}
              className="flex items-start gap-2 border border-border rounded-md p-3 bg-card"
            >
              <div className="flex flex-col gap-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={idx === 0}
                  onClick={() => moveDraft(example.tempId, 'up')}
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={idx === draftExamples.length - 1}
                  onClick={() => moveDraft(example.tempId, 'down')}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">{example.engSentence}</p>
                <p className="text-sm text-muted-foreground mt-0.5" dir="rtl">
                  {example.perTranslation}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setEditingExampleId(example.tempId)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDeleteDraft(example.tempId)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ),
        )}

        {showAddForm && (
          <ExampleForm
            onSave={handleAddDraft}
            onCancel={() => setShowAddForm(false)}
          />
        )}
      </div>
    </div>
  )
}
