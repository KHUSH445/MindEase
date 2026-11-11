import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faComment, faTrash, faMessage, faXmark } from "@fortawesome/free-solid-svg-icons";

function AISidebar({
    conversations = [],
    activeConversationId,
    onSelectConversation,
    onNewChat,
    onDeleteConversation,
    isOpen = false,
    onClose,
}) {
    // Helper to group conversations by date (Today, Yesterday, Previous)
    const groupConversations = () => {
        const today = [];
        const yesterday = [];
        const previous = [];

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const yesterdayStart = todayStart - 86400000;

        conversations.forEach((conv) => {
            const timeVal = conv.last_updated ? new Date(conv.last_updated).getTime() : 0;
            if (timeVal >= todayStart) {
                today.push(conv);
            } else if (timeVal >= yesterdayStart) {
                yesterday.push(conv);
            } else {
                previous.push(conv);
            }
        });

        return { today, yesterday, previous };
    };

    const { today, yesterday, previous } = groupConversations();

    const handleSelect = (convId) => {
        onSelectConversation(convId);
        if (onClose) onClose();
    };

    const handleNew = () => {
        onNewChat();
        if (onClose) onClose();
    };

    const renderGroup = (title, items) => {
        if (items.length === 0) return null;

        return (
            <div className="mb-6">
                <h3 className="px-3 mb-2 text-xs font-semibold text-textSecondary uppercase tracking-wider">
                    {title}
                </h3>
                <div className="space-y-1">
                    {items.map((conv) => {
                        const isActive = conv.conversation_id === activeConversationId;
                        return (
                            <div
                                key={conv.conversation_id}
                                onClick={() => handleSelect(conv.conversation_id)}
                                className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs transition-all ${
                                    isActive
                                        ? "bg-primaryLight text-primary font-medium border border-primary/20 shadow-xs"
                                        : "text-textSecondary hover:bg-gray-100 hover:text-textPrimary"
                                }`}
                            >
                                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                    <FontAwesomeIcon
                                        icon={faMessage}
                                        className={isActive ? "text-primary text-xs shrink-0" : "text-gray-400 text-xs shrink-0"}
                                    />
                                    <span className="truncate max-w-[140px] leading-snug">
                                        {conv.title || "Untitled Conversation"}
                                    </span>
                                </div>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteConversation(conv.conversation_id);
                                    }}
                                    title="Delete conversation"
                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-opacity rounded-md"
                                >
                                    <FontAwesomeIcon icon={faTrash} className="text-xs" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const sidebarContent = (
        <div className="flex flex-col h-full w-full bg-white">
            {/* Header / New Chat Action */}
            <div className="p-4 border-b border-border/50 flex items-center justify-between gap-2">
                <button
                    onClick={handleNew}
                    className="flex-1 bg-primary hover:bg-primaryDark text-white py-2.5 px-4 rounded-xl font-medium text-xs flex items-center justify-center gap-2 shadow-sm transition-all hover:shadow cursor-pointer"
                >
                    <FontAwesomeIcon icon={faPlus} />
                    <span>New Chat</span>
                </button>

                {/* Mobile Close Button */}
                {onClose && (
                    <button
                        onClick={onClose}
                        className="md:hidden w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                        aria-label="Close chat sidebar"
                    >
                        <FontAwesomeIcon icon={faXmark} className="text-sm" />
                    </button>
                )}
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                {conversations.length === 0 ? (
                    <div className="text-center py-8 px-4 text-textSecondary text-xs">
                        <FontAwesomeIcon icon={faComment} className="text-2xl mb-2 text-gray-300" />
                        <p>No past AI conversations</p>
                        <p className="mt-1 text-[11px] text-gray-400">Start a new chat above</p>
                    </div>
                ) : (
                    <>
                        {renderGroup("Today", today)}
                        {renderGroup("Yesterday", yesterday)}
                        {renderGroup("Previous", previous)}
                    </>
                )}
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop Persistent Sidebar */}
            <aside className="hidden md:flex w-64 h-full border-r border-border flex-col shrink-0">
                {sidebarContent}
            </aside>

            {/* Mobile Slide-over Drawer with Backdrop */}
            {isOpen && (
                <div className="md:hidden fixed inset-0 z-50 flex">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
                        onClick={onClose}
                        aria-hidden="true"
                    />

                    {/* Drawer Content */}
                    <aside className="relative w-72 max-w-[80vw] h-full bg-white shadow-2xl z-10 flex flex-col animate-in slide-in-from-left duration-200">
                        {sidebarContent}
                    </aside>
                </div>
            )}
        </>
    );
}

export default AISidebar;
