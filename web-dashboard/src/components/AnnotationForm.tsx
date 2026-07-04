import React, { useState } from 'react'
import { MessageSquare, Send, X, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { cn, formatDate } from '@/lib/utils'

export interface Annotation {
  id: string
  readingId: string
  author: string
  text: string
  timestamp: string
  replies: AnnotationReply[]
}

export interface AnnotationReply {
  id: string
  author: string
  text: string
  timestamp: string
}

interface AnnotationFormProps {
  readingId: string
  readingLabel?: string
  annotations: Annotation[]
  onAddAnnotation: (readingId: string, text: string) => void
  onAddReply: (annotationId: string, text: string) => void
  onDeleteAnnotation?: (id: string) => void
}

export default function AnnotationForm({
  readingId,
  readingLabel,
  annotations,
  onAddAnnotation,
  onAddReply,
  onDeleteAnnotation,
}: AnnotationFormProps) {
  const [open, setOpen] = useState(false)
  const [newText, setNewText] = useState('')
  const [replyText, setReplyText] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)

  const readingAnnotations = annotations.filter((a) => a.readingId === readingId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newText.trim()) return
    onAddAnnotation(readingId, newText.trim())
    setNewText('')
  }

  const handleReplySubmit = (annotationId: string) => {
    if (!replyText.trim()) return
    onAddReply(annotationId, replyText.trim())
    setReplyText('')
    setReplyingTo(null)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative rounded-lg p-2 hover:bg-muted transition-colors"
        aria-label={`${readingAnnotations.length} annotation${readingAnnotations.length !== 1 ? 's' : ''}`}
        title="Annotations"
      >
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        {readingAnnotations.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-[8px] font-bold text-white">
            {readingAnnotations.length}
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Annotations
          </DialogTitle>
          <DialogDescription>
            {readingLabel ? `Reading: ${readingLabel}` : 'Add notes and comments to this reading'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 max-h-[50vh] overflow-y-auto">
          {/* Add new annotation */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Add a note..."
              className="flex-1"
            />
            <Button type="submit" size="sm" disabled={!newText.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>

          {/* Annotation list */}
          {readingAnnotations.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No annotations yet</p>
              <p className="text-xs">Add the first note to this reading</p>
            </div>
          ) : (
            <div className="space-y-3">
              {readingAnnotations.map((annotation) => (
                <div
                  key={annotation.id}
                  className="rounded-lg border border-border p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600/20 text-emerald-400">
                        <User className="h-3 w-3" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{annotation.author}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDate(annotation.timestamp)}
                        </p>
                      </div>
                    </div>
                    {onDeleteAnnotation && (
                      <button
                        onClick={() => onDeleteAnnotation(annotation.id)}
                        className="rounded p-1 hover:bg-muted text-muted-foreground"
                        aria-label="Delete annotation"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm pl-8">{annotation.text}</p>

                  {/* Replies */}
                  {annotation.replies.length > 0 && (
                    <div className="ml-8 space-y-2 border-l-2 border-border pl-3">
                      {annotation.replies.map((reply) => (
                        <div key={reply.id} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted">
                              <User className="h-2.5 w-2.5" />
                            </div>
                            <span className="text-xs font-medium">{reply.author}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDate(reply.timestamp)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground pl-7">{reply.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply form */}
                  {replyingTo === annotation.id ? (
                    <div className="flex gap-2 pl-8">
                      <Input
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write a reply..."
                        className="flex-1 h-8 text-xs"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => handleReplySubmit(annotation.id)}
                        disabled={!replyText.trim()}
                      >
                        <Send className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2"
                        onClick={() => {
                          setReplyingTo(null)
                          setReplyText('')
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setReplyingTo(annotation.id)}
                      className="ml-8 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Reply
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  )
}
