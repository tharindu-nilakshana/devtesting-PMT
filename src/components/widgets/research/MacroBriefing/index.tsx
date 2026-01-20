'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { getAuthToken } from "@/utils/api";
import { X, Loader2, ChevronDown, ChevronUp, SmilePlus } from "lucide-react";
import widgetDataWebSocket from '@/utils/widgetWebSocket';

type WidgetSettings = Record<string, unknown>;

interface MacroBriefingProps {
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  settings?: WidgetSettings;
}

interface ApiReaction {
  emojiId: string;
  count: number;
  userReacted: boolean;
  userNames?: string;
}

interface ApiPost {
  ID: number;
  Title: string;
  Content: string;
  AuthorID: number;
  CreatedAtTimestamp: number;
  UpdatedAtTimestamp: number;
  CreatedAtLocal?: string;
  UpdatedAtLocal?: string;
  authorName?: string;
  authorImage?: string;
  reactions?: ApiReaction[];
}

interface MacroBriefingResponse {
  success: boolean;
  posts?: ApiPost[];
}

interface Emoji {
  id: string;
  char: string;
  tags: string[];
}

interface PostReaction extends ApiReaction {
  emojiChar: string;
}

interface MacroBriefingPost {
  id: number;
  title: string;
  content: string;
  authorName: string;
  authorImage?: string;
  createdAt: number | null;
  updatedAt: number | null;
  createdAtDisplay: string;
  updatedAtDisplay: string;
  reactions: PostReaction[];
}

const emojiGroups = [
  { tag: "happy", emojis: ["😀","😃","😄","😁","😆","🥹","😅","😂","🤣","😍","😌","😉","🙃","🙂","😇","😊","🥲","🥰","😋"] },
  { tag: "love", emojis: ["😘","😗","😙","😚"] },
  { tag: "celebration", emojis: ["🤩","🥳","😎"] },
  { tag: "thinking", emojis: ["🤔","🧐","🤨","🤓","🥸"] },
  { tag: "neutral", emojis: ["😐","🫤","😑","😶","🫥"] },
  { tag: "sad", emojis: ["😞","😔","😕","🙁","☹️","😢","😭","🥺","😟","🙄"] },
  { tag: "angry", emojis: ["😡","😠","😒","😖","😣","😤"] },
  { tag: "worried", emojis: ["😰","😨","😱","😧","😦","😵"] },
  { tag: "surprised", emojis: ["😲","😮","😯","😮‍💨","🤯","😳"] },
  { tag: "tired", emojis: ["😪","😫","😩","🥱","😴","🤤"] },
  { tag: "physical", emojis: ["🥵","🥶","🤒","😷"] },
  { tag: "playful", emojis: ["😏","😬","😓","🤥","😶‍🌫️","🫠","🤫","🫡","🫢","🤭","🫣","🤗","😮","🥸"] },
] as const;

const EMOJI_LIBRARY: Emoji[] = (() => {
  let counter = 1;
  const collection: Emoji[] = [];
  emojiGroups.forEach(group => {
    group.emojis.forEach(char => {
      collection.push({
        id: `u${String(counter++).padStart(5, '0')}`,
        char,
        tags: [group.tag, "emoji", char],
      });
    });
  });
  return collection;
})();

const emojiLookup = EMOJI_LIBRARY.reduce<Record<string, Emoji>>((acc, emoji) => {
  acc[emoji.id] = emoji;
  return acc;
}, {});

const MAX_PREVIEW_CHARS = 480;

const normalizeEmojiId = (emojiId: string) => {
  if (!emojiId) return '';
  const clean = emojiId.replace(/^u/i, '').padStart(5, '0');
  return `u${clean}`;
};

const emojiIdToNumber = (emojiId: string) => {
  const normalized = emojiId.replace(/^u/i, '');
  const parsed = parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const getEmojiChar = (emojiId: string) => {
  const normalized = normalizeEmojiId(emojiId);
  return emojiLookup[normalized]?.char || '😀';
};

const stripHtmlTags = (html: string) => {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();
};

const toTimestamp = (value?: string | number) => {
  if (!value) return null;
  const ms = typeof value === 'number' ? value * 1000 : Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
};

const formatRelativeTimestamp = (value?: number | null) => {
  if (!value) return '';
  const now = Date.now();
  const diffMs = now - value;
  if (diffMs < 0) {
    const futureDate = new Date(value);
    return futureDate.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return 'Just now';
  if (diffMs < hour) {
    const mins = Math.floor(diffMs / minute);
    return `${mins} min${mins === 1 ? '' : 's'} ago`;
  }
  if (diffMs < day) {
    const hrs = Math.floor(diffMs / hour);
    return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  }
  const days = Math.floor(diffMs / day);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  const date = new Date(value);
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  });
};

async function callPmtEndpoint<T>(endpoint: string, payload: Record<string, unknown>) {
  const token = getAuthToken();
  const response = await fetch(`/api/pmt/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload ?? {}),
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

export function MacroBriefing({ onSettings, onRemove, onFullscreen }: MacroBriefingProps) {
  const [posts, setPosts] = useState<MacroBriefingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEmojiModal, setShowEmojiModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [emojiSearch, setEmojiSearch] = useState("");
  const [reactionLoading, setReactionLoading] = useState(false);
  const [removalKey, setRemovalKey] = useState<string | null>(null);
  const [expandedPosts, setExpandedPosts] = useState<Record<number, boolean>>({});
  const [cursor, setCursor] = useState<number | null>(null);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [wsConnectionStatus, setWsConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');

  const transformPost = useCallback((post: ApiPost): MacroBriefingPost => {
    const normalizedReactions: PostReaction[] = (post.reactions || []).map((reaction) => {
      const normalizedId = normalizeEmojiId(reaction.emojiId);
                return {
                  ...reaction,
        emojiId: normalizedId,
        emojiChar: getEmojiChar(normalizedId),
      };
    });
    const createdAt = toTimestamp(post.CreatedAtTimestamp || post.CreatedAtLocal);
    const updatedAt = toTimestamp(post.UpdatedAtTimestamp || post.UpdatedAtLocal);
    return {
      id: post.ID,
      title: post.Title,
      content: post.Content,
      authorName: post.authorName || `Author ${post.AuthorID}`,
      authorImage: post.authorImage,
      createdAt,
      updatedAt,
      createdAtDisplay: formatRelativeTimestamp(createdAt),
      updatedAtDisplay: formatRelativeTimestamp(updatedAt),
      reactions: normalizedReactions,
    };
  }, []);

  const fetchPosts = useCallback(
    async (append = false) => {
      if (append) {
        setIsFetchingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const payload = append && cursor ? { lastPostId: cursor } : {};
        const data = await callPmtEndpoint<MacroBriefingResponse>('getPostsContent', payload);
        if (!data.success) {
          throw new Error('Failed to load macro briefings');
        }
        const fetchedPosts = (data.posts || []).map(transformPost);

        setPosts((prev) => {
          if (append) {
            const existingIds = new Set(prev.map((p) => p.id));
            const merged = [...prev];
            fetchedPosts.forEach((post) => {
              if (!existingIds.has(post.id)) {
                merged.push(post);
              }
            });
            return merged;
          }
          return fetchedPosts;
        });

        if (fetchedPosts.length > 0) {
          const nextCursor = fetchedPosts[fetchedPosts.length - 1].id;
          setCursor(nextCursor);
        } else {
          setHasMore(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load macro briefings');
      } finally {
        setLoading(false);
        setIsFetchingMore(false);
      }
    },
    [cursor, transformPost]
  );

  useEffect(() => {
    fetchPosts(false);
  }, [fetchPosts]);

  // WebSocket connection management for real-time macro briefing updates
  useEffect(() => {
    // CRITICAL: Only connect WebSocket on client-side to avoid SSR issues
    if (typeof window === 'undefined') {
      console.log('🚫 [MacroBriefing] Skipping WebSocket connection during SSR');
      return;
    }

    const handleRealtimeData = (event: Event) => {
      const customEvent = event as CustomEvent<{
        widgetName: string;
        data: any;
        rawData: string;
        timestamp: string;
      }>;
      const { widgetName, data } = customEvent.detail;

      console.log('📰 [MacroBriefing] Received WebSocket update:', {
        widgetName,
        hasData: !!data,
        data: data
      });

      // Check if this is a macro briefing-related update
      const isBriefingUpdate = widgetName.toLowerCase().includes('macrobriefing') ||
                               widgetName.toLowerCase().includes('macro-briefing') ||
                               widgetName.toLowerCase().includes('briefing') ||
                               widgetName === 'macrobriefing' ||
                               widgetName === 'macro-briefing';

      if (isBriefingUpdate) {
        console.log('📰 [MacroBriefing] Processing briefing update - triggering data refresh');
        fetchPosts(false);
      }
    };

    const connectWebSocket = async () => {
      try {
        console.log('🔗 [MacroBriefing] Setting up WebSocket connection...');

        // Set up connection status callback
        widgetDataWebSocket.onConnectionStatus((status) => {
          console.log('🔗 [MacroBriefing] WebSocket status:', status);
          setWsConnectionStatus(status);
        });

        // Set up widget update callback
        widgetDataWebSocket.onWidgetUpdate((widgetName) => {
          console.log('📨 [MacroBriefing] Received WebSocket update:', widgetName);

          // Check if this is a macro briefing-related update
          const isBriefingUpdate = widgetName.toLowerCase().includes('macrobriefing') ||
                                   widgetName.toLowerCase().includes('macro-briefing') ||
                                   widgetName.toLowerCase().includes('briefing') ||
                                   widgetName === 'macrobriefing' ||
                                   widgetName === 'macro-briefing';

          if (isBriefingUpdate) {
            console.log('🔄 [MacroBriefing] Refreshing data due to WebSocket update');
            fetchPosts(false);
          }
        });

        // Add event listener for detailed data
        window.addEventListener('pmt-widget-data', handleRealtimeData);

        // Connect to WebSocket with timeout handling
        await widgetDataWebSocket.connect();
        console.log('✅ [MacroBriefing] WebSocket connection established');
        
        // Get initial connection status immediately after connecting
        // This handles the case where the websocket was already connected
        const currentStatus = widgetDataWebSocket.getConnectionStatus();
        console.log('🔗 [MacroBriefing] Initial connection status:', currentStatus);
        if (currentStatus) {
          setWsConnectionStatus(currentStatus as 'connecting' | 'connected' | 'disconnected' | 'error');
        }
      } catch (error) {
        console.error('❌ [MacroBriefing] Failed to connect to WebSocket:', error);
        setWsConnectionStatus('error');
      }
    };

    // Connect with a small delay to ensure component is mounted
    const timeoutId = setTimeout(() => {
      connectWebSocket();
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('pmt-widget-data', handleRealtimeData);
    };
  }, [fetchPosts]);

  const toggleExpanded = (postId: number) => {
    setExpandedPosts((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const openEmojiPicker = (postId: number) => {
    setSelectedPostId(postId);
    setShowEmojiModal(true);
    setEmojiSearch('');
  };

  const closeEmojiPicker = () => {
    setSelectedPostId(null);
    setShowEmojiModal(false);
    setReactionLoading(false);
  };

  const handleAddReaction = async (emoji: Emoji) => {
    if (!selectedPostId) return;
    setReactionLoading(true);
    try {
      await callPmtEndpoint('addReactionToPost', {
        PostID: selectedPostId,
        EmojiID: emojiIdToNumber(emoji.id),
        Emoji: emoji.char,
      });
      closeEmojiPicker();
      fetchPosts(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add reaction');
      setReactionLoading(false);
    }
  };

  const handleRemoveReaction = async (postId: number, reaction: PostReaction) => {
    if (!reaction.userReacted) return;
    const key = `${postId}-${reaction.emojiId}`;
    setRemovalKey(key);
    try {
      await callPmtEndpoint('removeReactionFromPost', {
        PostID: postId,
        EmojiID: emojiIdToNumber(reaction.emojiId),
      });
      await fetchPosts(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to remove reaction');
    } finally {
      setRemovalKey(null);
    }
  };

  const filteredEmojis = useMemo(() => {
    if (!emojiSearch.trim()) return EMOJI_LIBRARY;
    const query = emojiSearch.toLowerCase();
    return EMOJI_LIBRARY.filter((emoji) =>
      emoji.tags.some((tag) => tag.toLowerCase().includes(query)) || emoji.char.includes(query)
    );
  }, [emojiSearch]);

  const renderPostContent = (post: MacroBriefingPost) => {
    const plainText = stripHtmlTags(post.content);
    const isExpanded = !!expandedPosts[post.id];
    const preview = plainText.length > MAX_PREVIEW_CHARS && !isExpanded
      ? `${plainText.slice(0, MAX_PREVIEW_CHARS)}…`
      : plainText;
    return (
    <div className="space-y-3">
        <p className="text-base text-foreground/90 whitespace-pre-line leading-relaxed">
          {preview}
        </p>
        {plainText.length > MAX_PREVIEW_CHARS && (
          <button
            className="text-sm text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
            onClick={() => toggleExpanded(post.id)}
          >
            {isExpanded ? (
              <>
                Show Less <ChevronUp className="w-3 h-3" />
              </>
            ) : (
              <>
                Read More <ChevronDown className="w-3 h-3" />
              </>
            )}
          </button>
        )}
      </div>
    );
  };

  const emptyState = !loading && posts.length === 0;

  return (
    <div className="w-full h-full bg-widget-body border border-border flex flex-col overflow-hidden relative">
      <WidgetHeader
        title="Macro Briefing"
        subtitle="Expert Market Analysis & Commentary"
        onRemove={onRemove}
        onFullscreen={onFullscreen}
        helpContent="In-depth macro analysis covering liquidity conditions, central bank policy, market structure, and key themes driving currency markets."
      >
        <div className="flex items-center gap-1 mr-2">
          <div 
            className={`w-2 h-2 rounded-full ${
              wsConnectionStatus === 'connected' ? 'bg-green-500' :
              wsConnectionStatus === 'connecting' ? 'bg-yellow-500' :
              wsConnectionStatus === 'error' ? 'bg-red-500' :
              'bg-gray-500'
            }`}
            title={`WebSocket: ${wsConnectionStatus}`}
          />
          {wsConnectionStatus === 'connected' && (
            <span className="text-xs text-green-500 font-medium">Live</span>
          )}
        </div>
      </WidgetHeader>

      <div className="px-4 py-2 border-b border-border bg-widget-header flex items-center text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Stay updated with real-time macro briefings</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <div className="p-4 space-y-4">
          {error && (
            <div className="border border-destructive/40 bg-destructive/10 text-destructive text-sm p-3 rounded flex items-start justify-between">
              <span>{error}</span>
              <button className="text-xs underline" onClick={() => fetchPosts(false)}>
                Retry
              </button>
            </div>
          )}

          {loading && posts.length === 0 && (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="border border-border bg-card animate-pulse p-4 space-y-3 rounded">
                  <div className="h-5 w-1/2 bg-muted rounded" />
                  <div className="h-4 w-3/4 bg-muted rounded" />
                  <div className="h-4 w-full bg-muted rounded" />
                  <div className="h-4 w-5/6 bg-muted rounded" />
                </div>
              ))}
            </div>
          )}

          {emptyState && (
            <div className="text-center text-base text-muted-foreground border border-border rounded p-6 bg-card/40">
              No macro briefings available yet.
            </div>
          )}

          {posts.map((post) => (
            <div key={post.id} className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
              <div className="flex items-center gap-3 p-4 border-b border-border bg-widget-header">
                {post.authorImage ? (
                <img
                    src={post.authorImage}
                    alt={post.authorName}
                    className="w-9 h-9 rounded-full object-cover border border-border/60"
                />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary/30 text-primary flex items-center justify-center border border-primary/50 text-sm font-semibold uppercase">
                    {post.authorName?.charAt(0) || 'A'}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base text-foreground font-semibold">{post.authorName}</span>
                    <span className="text-xs text-muted-foreground">{post.createdAtDisplay}</span>
                  </div>
                  {post.updatedAt && post.updatedAtDisplay && post.updatedAt !== post.createdAt && (
                    <span className="text-xs text-muted-foreground/70">Updated {post.updatedAtDisplay}</span>
                  )}
                </div>
                <button
                  onClick={() => openEmojiPicker(post.id)}
                  className="text-sm inline-flex items-center gap-1 px-3 py-1.5 rounded border border-border hover:border-primary text-muted-foreground hover:text-primary transition-colors"
                >
                  <SmilePlus className="w-3 h-3" /> React
                </button>
              </div>

              <div className="px-4 pt-4 pb-2 space-y-3">
                <h3 className="text-xl text-primary/90 leading-tight">{post.title}</h3>
                {renderPostContent(post)}
              </div>

              <div className="px-4 py-3 border-t border-border bg-widget-header/60">
                {post.reactions.length === 0 ? (
                  <span className="text-sm text-muted-foreground">Be the first to react.</span>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {post.reactions.map((reaction) => {
                      const key = `${post.id}-${reaction.emojiId}`;
                      const isRemoving = removalKey === key;
                      return (
                        <button
                          key={reaction.emojiId}
                          onClick={() => handleRemoveReaction(post.id, reaction)}
                          disabled={isRemoving || !reaction.userReacted}
                        className={`px-2.5 py-1.5 rounded-md inline-flex items-center gap-2.5 transition-colors ${
                            reaction.userReacted
                              ? 'bg-muted/50 border border-primary text-foreground hover:bg-muted/70'
                              : 'bg-muted/50 text-muted-foreground cursor-default hover:bg-muted/70'
                          } ${isRemoving ? 'opacity-60' : ''}`}
                          title={reaction.userNames || undefined}
                        >
                          <span className="text-base leading-none">{reaction.emojiChar}</span>
                          <span className="text-sm font-medium">{reaction.count}</span>
                          {isRemoving && <Loader2 className="w-3 h-3 animate-spin" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}

          {hasMore && !loading && posts.length > 0 && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => fetchPosts(true)}
                disabled={isFetchingMore}
                className="px-4 py-2 text-base border border-border rounded text-muted-foreground hover:text-primary hover:border-primary transition-colors disabled:opacity-50"
              >
                {isFetchingMore ? 'Loading…' : 'Load older briefings'}
              </button>
            </div>
          )}
        </div>
      </div>

      {showEmojiModal && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div>
                <p className="text-base font-semibold text-foreground">Add Reaction</p>
                <p className="text-sm text-muted-foreground">Pick an emoji to react to this briefing</p>
              </div>
              <button onClick={closeEmojiPicker} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 py-3 border-b border-border">
              <input
                type="text"
                value={emojiSearch}
                onChange={(event) => setEmojiSearch(event.target.value)}
                placeholder="Search emoji..."
                className="w-full px-3 py-2 text-sm rounded border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="flex-1 overflow-auto px-4 py-3">
              <div className="grid grid-cols-10 gap-1.5 max-h-[240px] overflow-y-auto p-2 border border-border rounded bg-black">
                {filteredEmojis.map((emoji) => (
                  <button
                    key={emoji.id}
                    onClick={() => handleAddReaction(emoji)}
                    disabled={reactionLoading}
                    className="h-9 w-9 flex items-center justify-center rounded text-xl transition-all bg-background hover:bg-muted border border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {emoji.char}
                  </button>
                ))}
              </div>
              {filteredEmojis.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-6">
                  No emojis match your search.
                </div>
              )}
            </div>

            {reactionLoading && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MacroBriefing;
