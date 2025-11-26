import React, { useState } from 'react';
import { X, Loader2, Sparkles } from 'lucide-react';

interface TitlePageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: TitlePageData) => void;
    isGenerating: boolean;
    totalPages: number; // Total number of pages in the document
}

export interface TitlePageData {
    recipient: string;
    title: string;
    subtitle: string;
    date: string;
    affiliation: string;
    name: string;
    referencePageNumber?: number; // 1-indexed page number to use as style reference
    additionalInstructions?: string; // Custom instructions for generation
}

export const TitlePageModal: React.FC<TitlePageModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    isGenerating,
    totalPages
}) => {
    const [data, setData] = useState<TitlePageData>({
        recipient: '',
        title: '',
        subtitle: '',
        date: new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }),
        affiliation: '',
        name: '',
        referencePageNumber: totalPages > 0 ? 1 : undefined,
        additionalInstructions: ''
    });

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(data);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-2 text-brand-600">
                        <Sparkles size={24} />
                        <h2 className="text-xl font-bold text-gray-900">タイトルページ作成</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        disabled={isGenerating}
                    >
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">相手先 (Recipient)</label>
                        <input
                            type="text"
                            value={data.recipient}
                            onChange={(e) => setData({ ...data, recipient: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                            placeholder="例: 株式会社サンプル 御中"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">タイトル (Title)</label>
                        <input
                            type="text"
                            value={data.title}
                            onChange={(e) => setData({ ...data, title: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                            placeholder="例: 新規事業のご提案"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">サブタイトル (Subtitle)</label>
                        <input
                            type="text"
                            value={data.subtitle}
                            onChange={(e) => setData({ ...data, subtitle: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                            placeholder="例: AI活用による業務効率化について"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">日付 (Date)</label>
                            <input
                                type="text"
                                value={data.date}
                                onChange={(e) => setData({ ...data, date: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                                placeholder="2024年1月1日"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">所属 (Affiliation)</label>
                            <input
                                type="text"
                                value={data.affiliation}
                                onChange={(e) => setData({ ...data, affiliation: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                                placeholder="例: 営業部"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">名前 (Name)</label>
                        <input
                            type="text"
                            value={data.name}
                            onChange={(e) => setData({ ...data, name: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                            placeholder="例: 山田 太郎"
                        />
                    </div>

                    {totalPages > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">参照ページ番号 (Reference Page)</label>
                            <select
                                value={data.referencePageNumber || ''}
                                onChange={(e) => setData({ ...data, referencePageNumber: e.target.value ? parseInt(e.target.value) : undefined })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                            >
                                <option value="">なし (None)</option>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                                    <option key={pageNum} value={pageNum}>ページ {pageNum}</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">スタイルの参照元となるページを選択</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">追加の指示 (Additional Instructions)</label>
                        <textarea
                            value={data.additionalInstructions || ''}
                            onChange={(e) => setData({ ...data, additionalInstructions: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all resize-none"
                            placeholder="例: 明るい色使いで、モダンなデザインにしてください"
                            rows={3}
                        />
                        <p className="text-xs text-gray-500 mt-1">生成時の追加指示(任意)</p>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                            disabled={isGenerating}
                        >
                            キャンセル
                        </button>
                        <button
                            type="submit"
                            className="flex items-center gap-2 px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium shadow-md transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isGenerating}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    作成中...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={18} />
                                    ページ作成
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
