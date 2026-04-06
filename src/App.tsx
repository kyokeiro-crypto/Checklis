import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, RefreshCw, ClipboardList, ChevronDown, ChevronUp, Home, Building, FileText, KeyRound, Download, CloudUpload, User, FileSpreadsheet, Plus, LogOut, LogIn, Trash2, Users, Search, Eye, PenTool, Settings, CheckSquare, Menu, X, Folder, Archive } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { db, auth, signInWithGoogle, logOut } from './firebase';
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

type Task = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
};

type FactorType = 'text' | 'textarea' | 'select' | 'checkbox_group';

type Factor = {
  id: string;
  title: string;
  type: FactorType;
  value: any;
  options?: string[];
  placeholder?: string;
};

type Phase = {
  id: string;
  title: string;
  iconName: string;
  tasks: Task[];
  factors?: Factor[];
};

const initialData: Phase[] = [
  {
    id: 'phase-1',
    title: '1. 顧客要望・身元確認 (ヒアリング)',
    iconName: 'user',
    factors: [
      { id: 'f1-visit', title: '来店のきっかけ', type: 'checkbox_group', value: [], options: ['ご紹介', '引越し予定の地域にあった', '会社名を知っていた', '以前にも利用した', '今の住まいから近所', '会社から指定', '物件看板', '当社ホームページ', 'Facebook', 'Instagram', 'SUUMO', 'その他'] },
      { id: 'f1-reason', title: '引っ越し理由', type: 'checkbox_group', value: [], options: ['入学', '就職', '転勤', '結婚', '別居', '短期入居', '独立', '契約満了', '現居改善', '家族増員', 'ペットを飼う', '通勤通学不便', '家賃を安く', '駐車場改善', '契約条件違反', 'その他'] },
      { id: 'f1-name', title: 'お客様氏名', type: 'text', value: '', placeholder: '氏名' },
      { id: 'f1-kana', title: 'ふりがな', type: 'text', value: '', placeholder: 'ふりがな' },
      { id: 'f1-type', title: '個人/法人', type: 'select', value: '', options: ['個人', '法人'] },
      { id: 'f1-gender', title: '性別', type: 'select', value: '', options: ['男', '女'] },
      { id: 'f1-birth', title: '生年月日・年齢', type: 'text', value: '', placeholder: '例: 1990年1月1日 (30歳)' },
      { id: 'f1-phone', title: '携帯電話', type: 'text', value: '', placeholder: '090-0000-0000' },
      { id: 'f1-address', title: 'ご住所', type: 'text', value: '', placeholder: '〒' },
      { id: 'f1-email', title: 'メールアドレス', type: 'text', value: '', placeholder: 'example@email.com' },
      { id: 'f1-relation', title: '借主との関係', type: 'select', value: '', options: ['本人(借主)', '夫', '妻', '子供', '親', '兄弟', '親戚', '上司・同僚', '代理人', '友人', '社宅担当者', '社宅代行業者', '法人入居者', 'その他'] },
      { id: 'f1-job', title: '職業について', type: 'select', value: '', options: ['学生', '正社員', 'アルバイト・パート', '契約社員・準社員', '役員・経営者', '無職', 'その他'] },
      { id: 'f1-jobtype', title: '職業種別', type: 'select', value: '', options: ['会社員', '公務員', 'フリーター', '自営業', '求職', 'その他'] },
      { id: 'f1-company', title: '勤務先・学校名', type: 'text', value: '', placeholder: '名称' },
      { id: 'f1-company-addr', title: '勤務先所在地・TEL', type: 'text', value: '', placeholder: '所在地 / TEL' },
      { id: 'f1-income', title: '税込年収・勤続年数', type: 'text', value: '', placeholder: '例: 400万円 / 3年' },
      { id: 'f1-occupants', title: '入居者構成', type: 'checkbox_group', value: [], options: ['1名', '2名以上', '同居(同棲)', '夫婦', '夫婦・子', '親・夫婦・子', '母・子', '高齢者', '身体障がい者'] },
      { id: 'f1-guarantor', title: '保証人の予定', type: 'select', value: '', options: ['親', '兄弟', '子供', '親戚', '上司・同僚', '友達', '検討中', '保証人不要物件', 'その他'] },
      { id: 'f1-area', title: '希望区', type: 'checkbox_group', value: [], options: ['中央', '西', '手稲', '北', '東', '白石', '厚別', '豊平', '清田', '南', '近郊', 'その他'] },
      { id: 'f1-line', title: '希望沿線・駅・徒歩', type: 'text', value: '', placeholder: '例: 南北線 さっぽろ駅 徒歩10分以内' },
      { id: 'f1-buildtype', title: '建物種類', type: 'checkbox_group', value: [], options: ['アパート', 'マンション', '分譲リース', '戸建', 'テラスハウス', '学生寮', 'ウィークリー型', 'その他'] },
      { id: 'f1-layout', title: '間取りタイプ', type: 'checkbox_group', value: [], options: ['1R・1K', '1LDK', '2LDK', '3LDK', '4LDK', '5LDK以上'] },
      { id: 'f1-rent', title: '希望家賃 (共益費・駐車代込)', type: 'text', value: '', placeholder: '上限 〇〇 万円まで' },
      { id: 'f1-parking', title: '駐車場・車タイプ', type: 'text', value: '', placeholder: '例: 要1台 / 普通乗用' },
      { id: 'f1-special', title: '特別条件', type: 'checkbox_group', value: [], options: ['犬', '猫', '楽器', '短期契約', '学校区', '対面K', 'エアコン', '2階以上', '都市ガス', '高層階', 'AL', 'テナント居抜き'] },
      { id: 'f1-timing', title: '引越時期', type: 'text', value: '', placeholder: '例: 2024年4月上旬' },
      { id: 'f1-current', title: '現住居分類', type: 'select', value: '', options: ['賃貸', '持家', '社宅', '寮', '親元', '親戚宅', '友人宅', 'その他'] },
      { id: 'f1-current-rent', title: '現住居の家賃・間取り', type: 'text', value: '', placeholder: '例: 1LDK / 6万円' },
      { id: 'f1-current-good', title: '現住居の良い点', type: 'textarea', value: '', placeholder: '良い点をご記入ください' },
      { id: 'f1-current-bad', title: '現住居の不満な点', type: 'textarea', value: '', placeholder: '不満な点をご記入ください' },
      { id: 'f1-idcopy', title: '身分証コピー取得', type: 'checkbox_group', value: [], options: ['在留カード', 'パスポート', '顔写真', '運転免許証', '銀行通帳', '住民票', '車検証', 'その他'] },
    ],
    tasks: [
      { id: 't1-1', title: 'ヒアリングシート記入', description: 'お客様の希望条件、引越理由、入居時期の詳細を確認', completed: false },
    ]
  },
  {
    id: 'phase-2',
    title: '2. 物件選定・提案',
    iconName: 'search',
    factors: [
      { id: 'f2-1', title: '初期費用希望', type: 'checkbox_group', value: [], options: ['敷金ゼロ', '礼金ゼロ', 'フリーレント希望', 'ネット無料'] },
      { id: 'f2-2', title: '資料提示方法', type: 'select', value: '', options: ['管理会社図面 (日本語)', '翻訳版テンプレート', 'VR / 動画案内'] },
    ],
    tasks: [
      { id: 't2-1', title: '物件資料送付', description: '条件に合う物件を3〜4件ピックアップして送付', completed: false },
      { id: 't2-2', title: '空室確認', description: '管理会社へ最新の空室状況と外国人入居の可否を確認', completed: false },
    ]
  },
  {
    id: 'phase-3',
    title: '3. 内覧準備・現地確認',
    iconName: 'eye',
    factors: [
      { id: 'f3-1', title: '鍵の手配方法', type: 'select', value: '', options: ['現地暗証番号', '管理会社借用', '業者間借用', 'オートロック直接解錠'] },
      { id: 'f3-2', title: '現地チェック項目', type: 'checkbox_group', value: [], options: ['ゴミ置き場確認', '採光・防音確認', '携帯電波確認', '寸法測定 (カーテン/冷蔵庫)'] },
    ],
    tasks: [
      { id: 't3-1', title: '内覧予約', description: '管理会社へ内覧予約、鍵の取得方法の確認', completed: false },
      { id: 't3-2', title: '現地案内', description: 'お客様と待ち合わせ、物件のメリット・デメリットを説明', completed: false },
    ]
  },
  {
    id: 'phase-4',
    title: '4. 申込・審査',
    iconName: 'file-text',
    factors: [
      { id: 'f4-1', title: '申込方法', type: 'select', value: '', options: ['WEB電子申込 (ITANDI BB等)', '紙・FAX申込'] },
      { id: 'f4-2', title: '必要書類', type: 'checkbox_group', value: [], options: ['在留カード', '収入証明 (源泉徴収票等)', '住民票', '内定通知書'] },
    ],
    tasks: [
      { id: 't4-1', title: '申込書記入', description: 'お客様へ申込書の記入依頼、必要書類の回収', completed: false },
      { id: 't4-2', title: '保証会社審査', description: '保証会社からの本人確認電話の案内、審査承認の取得', completed: false },
    ]
  },
  {
    id: 'phase-5',
    title: '5. 契約・決済',
    iconName: 'pen-tool',
    factors: [
      { id: 'f5-1', title: '契約形態', type: 'select', value: '', options: ['対面契約 (店舗)', 'IT重説 (オンライン)'] },
      { id: 'f5-2', title: '決済方法', type: 'select', value: '', options: ['銀行振込', 'クレジットカード', '口座振替'] },
    ],
    tasks: [
      { id: 't5-1', title: '費用明細送付', description: '初期費用の計算、請求書の送付', completed: false },
      { id: 't5-2', title: '重要事項説明', description: '宅建士による重説、契約書の署名捺印', completed: false },
      { id: 't5-3', title: '契約金入金確認', description: '期日までの着金確認', completed: false },
    ]
  },
  {
    id: 'phase-6',
    title: '6. 鍵渡し・入居',
    iconName: 'key-round',
    factors: [
      { id: 'f6-1', title: '鍵の受取', type: 'select', value: '', options: ['管理会社で直接受取', '仲介店舗で受取・手渡し'] },
      { id: 'f6-2', title: 'ライフライン手配', type: 'select', value: '', options: ['お客様自身で手配', '仲介代行手配'] },
    ],
    tasks: [
      { id: 't6-1', title: '鍵渡し', description: '鍵の引渡し、受領書のサイン', completed: false },
      { id: 't6-2', title: '入居説明', description: 'ゴミ出しルール、室内チェック表の案内', completed: false },
      { id: 't6-3', title: '取引台帳作成', description: 'プロジェクト完了、書類のファイリングと保管', completed: false },
    ]
  }
];

const renderIcon = (iconName: string) => {
  switch (iconName) {
    case 'user': return <User className="w-5 h-5" />;
    case 'search': return <Search className="w-5 h-5" />;
    case 'eye': return <Eye className="w-5 h-5" />;
    case 'file-text': return <FileText className="w-5 h-5" />;
    case 'pen-tool': return <PenTool className="w-5 h-5" />;
    case 'key-round': return <KeyRound className="w-5 h-5" />;
    default: return <ClipboardList className="w-5 h-5" />;
  }
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  
  const [checklists, setChecklists] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    '01-問合せ中案件': true,
    '02-申込中物件': true,
    '03-契約済み物件': true,
    '04-未成約の歴史アーカイブ': false,
  });

  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({
    'phase-1': true,
    'phase-2': false,
    'phase-3': false,
    'phase-4': false,
    'phase-5': false,
    'phase-6': false,
  });

  // Modal states
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'alert' | 'confirm' | 'prompt';
    inputValue?: string;
    onConfirm?: (val?: string) => void;
    onCancel?: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'alert' });

  const showAlert = (title: string, message: string) => {
    setModalConfig({ isOpen: true, title, message, type: 'alert', onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })) });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setModalConfig({
      isOpen: true, title, message, type: 'confirm',
      onConfirm: () => { onConfirm(); setModalConfig(prev => ({ ...prev, isOpen: false })); },
      onCancel: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
    });
  };

  const showPrompt = (title: string, message: string, onConfirm: (val: string) => void) => {
    setModalConfig({
      isOpen: true, title, message, type: 'prompt', inputValue: '',
      onConfirm: (val) => { onConfirm(val || ''); setModalConfig(prev => ({ ...prev, isOpen: false })); },
      onCancel: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
    });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !user) {
      setChecklists([]);
      return;
    }

    const q = query(collection(db, 'checklists'), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          phases: JSON.parse(data.phasesData)
        };
      });
      setChecklists(list);
      
      if (list.length > 0 && !selectedId) {
        setSelectedId(list[0].id);
      } else if (list.length === 0) {
        setSelectedId(null);
      }
    }, (error) => {
      console.error("Snapshot error:", error);
      showAlert('読み込みエラー', 'データの取得に失敗しました: ' + error.message);
    });

    return () => unsubscribe();
  }, [isAuthReady, user]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim() || !user) return;

    try {
      const newRef = doc(collection(db, 'checklists'));
      await setDoc(newRef, {
        customerName: newCustomerName.trim(),
        phasesData: JSON.stringify(initialData),
        status: 'active',
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setNewCustomerName('');
      setSelectedId(newRef.id);
      setIsSidebarOpen(false); // Close sidebar on mobile after adding
    } catch (error) {
      console.error("Add customer error:", error);
      showAlert('エラー', '追加に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleArchiveCustomer = async (id: string, name: string, currentStatus: string) => {
    const newStatus = currentStatus === 'archived' ? 'active' : 'archived';
    const actionName = newStatus === 'archived' ? 'アーカイブ' : '復元';
    showConfirm(`${actionName}の確認`, `「${name}」を${actionName}しますか？`, async () => {
      try {
        await updateDoc(doc(db, 'checklists', id), {
          status: newStatus,
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        console.error("Archive customer error:", error);
        showAlert('エラー', `${actionName}に失敗しました: ` + (error instanceof Error ? error.message : String(error)));
      }
    });
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    showConfirm('削除の確認', `本当に「${name}」のデータを削除しますか？`, async () => {
      try {
        await deleteDoc(doc(db, 'checklists', id));
        if (selectedId === id) setSelectedId(null);
      } catch (error) {
        console.error("Delete customer error:", error);
        showAlert('エラー', '削除に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
      }
    });
  };

  const updatePhases = async (id: string, newPhases: Phase[]) => {
    try {
      await updateDoc(doc(db, 'checklists', id), {
        phasesData: JSON.stringify(newPhases),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Update phases error:", error);
      showAlert('エラー', '更新に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const selectedChecklist = checklists.find(c => c.id === selectedId);

  const getCategory = (checklist: any) => {
    if (checklist.status === 'archived') return '04-未成約の歴史アーカイブ';
    
    const firstIncompletePhaseIndex = checklist.phases.findIndex((p: Phase) => !p.tasks.every(t => t.completed));
    
    if (firstIncompletePhaseIndex === -1) return '03-契約済み物件';
    if (firstIncompletePhaseIndex <= 2) return '01-問合せ中案件';
    if (firstIncompletePhaseIndex === 3) return '02-申込中物件';
    return '03-契約済み物件';
  };

  const categories = ['01-問合せ中案件', '02-申込中物件', '03-契約済み物件', '04-未成約の歴史アーカイブ'];
  const groupedChecklists = categories.reduce((acc, cat) => {
    acc[cat] = checklists.filter(c => getCategory(c) === cat);
    return acc;
  }, {} as Record<string, any[]>);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const toggleTask = (phaseId: string, taskId: string) => {
    if (!selectedChecklist) return;
    const newPhases = selectedChecklist.phases.map((phase: Phase) => {
      if (phase.id === phaseId) {
        return {
          ...phase,
          tasks: phase.tasks.map(task => 
            task.id === taskId ? { ...task, completed: !task.completed } : task
          )
        };
      }
      return phase;
    });
    updatePhases(selectedChecklist.id, newPhases);
  };

  const handleFactorChange = (phaseId: string, factorId: string, newValue: any) => {
    if (!selectedChecklist) return;
    const newPhases = selectedChecklist.phases.map((phase: Phase) => {
      if (phase.id === phaseId && phase.factors) {
        return {
          ...phase,
          factors: phase.factors.map(f => f.id === factorId ? { ...f, value: newValue } : f)
        };
      }
      return phase;
    });
    updatePhases(selectedChecklist.id, newPhases);
  };

  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => ({
      ...prev,
      [phaseId]: !prev[phaseId]
    }));
  };

  const resetProgress = () => {
    if (!selectedChecklist) return;
    showConfirm('リセットの確認', 'すべての進捗と設定をリセットしてもよろしいですか？', () => {
      updatePhases(selectedChecklist.id, initialData);
    });
  };

  const generateExcelWorkbook = () => {
    if (!selectedChecklist) return null;
    
    // Sheet 1: Tasks
    const taskData: any[] = [];
    selectedChecklist.phases.forEach((phase: Phase) => {
      phase.tasks.forEach(task => {
        taskData.push({
          '段階': phase.title,
          'タスク': task.title,
          '状態': task.completed ? '完了' : '未完了',
          '詳細': task.description
        });
      });
    });
    const taskSheet = XLSX.utils.json_to_sheet(taskData);
    taskSheet['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 10 }, { wch: 60 }];
    
    // Sheet 2: Factors
    const factorData: any[] = [];
    selectedChecklist.phases.forEach((phase: Phase) => {
      if (phase.factors) {
        phase.factors.forEach(factor => {
          let valStr = factor.value;
          if (Array.isArray(factor.value)) valStr = factor.value.join(', ');
          factorData.push({
            '段階': phase.title,
            '設定項目': factor.title,
            '選択・入力内容': valStr || ''
          });
        });
      }
    });
    const factorSheet = XLSX.utils.json_to_sheet(factorData);
    factorSheet['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 40 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, taskSheet, "進捗状況");
    if (factorData.length > 0) {
      XLSX.utils.book_append_sheet(workbook, factorSheet, "案件詳細");
    }
    
    return workbook;
  };

  const downloadExcel = () => {
    const workbook = generateExcelWorkbook();
    if (!workbook || !selectedChecklist) return;
    const fileName = `${selectedChecklist.customerName}様_賃貸契約進捗.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const downloadHearingSheet = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedChecklist) return;
    
    const phase1 = selectedChecklist.phases.find((p: Phase) => p.id === 'phase-1');
    if (!phase1 || !phase1.factors) return;

    const data: any[] = [];
    phase1.factors.forEach((factor: Factor) => {
      let valStr = factor.value;
      if (Array.isArray(factor.value)) valStr = factor.value.join('、 ');
      data.push({
        '項目': factor.title,
        '内容': valStr || ''
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet['!cols'] = [{ wch: 30 }, { wch: 60 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ヒアリングシート");
    
    const fileName = `${selectedChecklist.customerName}様_ヒアリングシート.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const uploadToDropbox = async () => {
    if (!selectedChecklist) return;
    
    showPrompt('Dropbox連携', 'Dropboxのアクセストークンを入力してください:\n(※初回のみ。開発者コンソールで取得したトークン)', async (token) => {
      if (!token) return;

      setIsUploading(true);
      const workbook = generateExcelWorkbook();
      if (!workbook) {
        setIsUploading(false);
        return;
      }
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const fileName = `${selectedChecklist.customerName}様_賃貸契約進捗.xlsx`;
      
      try {
        const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Dropbox-API-Arg': JSON.stringify({
              path: `/${fileName}`,
              mode: 'overwrite',
              autorename: true,
              mute: false
            }),
            'Content-Type': 'application/octet-stream'
          },
          body: excelBuffer
        });

        if (response.ok) {
          showAlert('成功', `✅ Dropboxへの保存が成功しました！\nファイル名: ${fileName}`);
        } else {
          const err = await response.text();
          showAlert('エラー', `❌ エラーが発生しました:\n${err}`);
        }
      } catch (error) {
        showAlert('エラー', `❌ ネットワークエラー:\n${error}`);
      } finally {
        setIsUploading(false);
      }
    });
  };

  if (!isAuthReady) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">読み込み中...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">チーム共有版</h1>
          <p className="text-slate-500 mb-8">チームメンバーとリアルタイムで進捗を共有・管理できます。</p>
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
          >
            <LogIn className="w-5 h-5" />
            <span>Googleでログイン</span>
          </button>
        </div>
      </div>
    );
  }

  const totalTasks = selectedChecklist ? selectedChecklist.phases.reduce((acc: number, phase: Phase) => acc + phase.tasks.length, 0) : 0;
  const completedTasks = selectedChecklist ? selectedChecklist.phases.reduce((acc: number, phase: Phase) => 
    acc + phase.tasks.filter(t => t.completed).length, 0
  ) : 0;
  const progressPercentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex overflow-hidden">
      {/* Modal Overlay */}
      <AnimatePresence>
        {modalConfig.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden"
            >
              <div className="p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-2">{modalConfig.title}</h3>
                <p className="text-slate-600 mb-6 whitespace-pre-wrap">{modalConfig.message}</p>
                
                {modalConfig.type === 'prompt' && (
                  <input 
                    type="text" 
                    autoFocus
                    value={modalConfig.inputValue}
                    onChange={(e) => setModalConfig(prev => ({ ...prev, inputValue: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="トークンを入力..."
                  />
                )}

                <div className="flex justify-end space-x-3">
                  {modalConfig.type !== 'alert' && (
                    <button 
                      onClick={modalConfig.onCancel}
                      className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                    >
                      キャンセル
                    </button>
                  )}
                  <button 
                    onClick={() => modalConfig.onConfirm?.(modalConfig.inputValue)}
                    className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors"
                  >
                    OK
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col h-screen transform transition-transform duration-300 ease-in-out md:relative ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isDesktopSidebarOpen ? 'md:translate-x-0 md:w-64' : 'md:-translate-x-full md:w-0 md:border-none overflow-hidden'}`}>
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="bg-blue-600 p-1.5 rounded text-white">
                <ClipboardList className="w-5 h-5" />
              </div>
              <h1 className="font-bold text-slate-800">賃貸契約管理</h1>
            </div>
            <button 
              className="md:hidden p-1 text-slate-500 hover:bg-slate-100 rounded"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleAddCustomer} className="flex space-x-2">
            <input
              type="text"
              value={newCustomerName}
              onChange={(e) => setNewCustomerName(e.target.value)}
              placeholder="新規お客様名"
              className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!newCustomerName.trim()}
              className="p-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 disabled:opacity-50 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {categories.map(category => {
            const items = groupedChecklists[category] || [];
            if (items.length === 0 && category !== '01-問合せ中案件') return null;
            
            return (
              <div key={category} className="space-y-1">
                <button 
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <div className="flex items-center space-x-1.5">
                    <Folder className="w-3.5 h-3.5" />
                    <span>{category}</span>
                  </div>
                  {expandedCategories[category] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                
                <AnimatePresence initial={false}>
                  {expandedCategories[category] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden space-y-0.5"
                    >
                      {items.map(checklist => (
                        <div
                          key={checklist.id}
                          className={`group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors ml-2 ${
                            selectedId === checklist.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                          onClick={() => {
                            setSelectedId(checklist.id);
                            setIsSidebarOpen(false);
                          }}
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <User className="w-4 h-4 flex-shrink-0" />
                            <span className="text-sm font-medium truncate">{checklist.customerName}</span>
                          </div>
                          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleArchiveCustomer(checklist.id, checklist.customerName, checklist.status);
                              }}
                              className="p-1 text-slate-400 hover:text-blue-500 transition-colors"
                              title={checklist.status === 'archived' ? '復元' : 'アーカイブ'}
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCustomer(checklist.id, checklist.customerName);
                              }}
                              className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                              title="削除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {items.length === 0 && (
                        <div className="px-5 py-2 text-xs text-slate-400 italic">
                          案件がありません
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 truncate">
              <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full bg-slate-200" />
              <span className="text-sm font-medium truncate">{user.displayName}</span>
            </div>
            <button
              onClick={logOut}
              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
              title="ログアウト"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative">
        {selectedChecklist ? (
          <>
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm px-4 sm:px-8 py-4 sm:py-6">
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <button 
                      onClick={() => setIsSidebarOpen(true)}
                      className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-md flex-shrink-0"
                    >
                      <Menu className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)}
                      className="hidden md:block p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-md flex-shrink-0"
                    >
                      <Menu className="w-6 h-6" />
                    </button>
                    <div className="min-w-0">
                      <h2 className="text-lg sm:text-2xl font-bold text-slate-800 truncate">{selectedChecklist.customerName}様</h2>
                      <p className="text-xs sm:text-sm text-slate-500 mt-0.5">リアルタイム同期中</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <button 
                      onClick={downloadExcel}
                      className="flex items-center justify-center text-sm bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 transition-colors w-9 h-9 sm:w-auto sm:px-3 sm:py-1.5 rounded-md shadow-sm"
                      title="Excelとしてダウンロード"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span className="hidden sm:inline sm:ml-1.5">Excel出力</span>
                    </button>
                    
                    <button 
                      onClick={uploadToDropbox}
                      disabled={isUploading}
                      className="flex items-center justify-center text-sm bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors w-9 h-9 sm:w-auto sm:px-3 sm:py-1.5 rounded-md shadow-sm disabled:opacity-50"
                      title="Dropboxへ直接保存"
                    >
                      <CloudUpload className="w-4 h-4" />
                      <span className="hidden sm:inline sm:ml-1.5">{isUploading ? '保存中...' : 'Dropbox保存'}</span>
                    </button>

                    <button 
                      onClick={resetProgress}
                      className="flex items-center justify-center text-sm text-slate-500 hover:text-red-600 transition-colors w-9 h-9 sm:w-auto sm:px-3 sm:py-1.5 rounded-md hover:bg-red-50"
                      title="進捗リセット"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-6 sm:mt-10 mb-4 sm:mb-8 px-2 sm:px-8">
                  <div className="relative flex justify-between items-center w-full">
                    {/* Background Line */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 sm:h-1.5 bg-slate-200 rounded-full" />
                    {/* Active Line */}
                    <div 
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-1 sm:h-1.5 bg-green-500 rounded-full transition-all duration-500 ease-out" 
                      style={{ width: `${Math.min(100, (selectedChecklist.phases.filter((p: Phase) => p.tasks.length > 0 && p.tasks.every(t => t.completed)).length / (selectedChecklist.phases.length - 1)) * 100)}%` }} 
                    />
                    
                    {/* Points */}
                    {selectedChecklist.phases.map((phase: Phase, index: number) => {
                      const isComplete = phase.tasks.length > 0 && phase.tasks.every(t => t.completed);
                      const isCurrent = !isComplete && (index === 0 || selectedChecklist.phases[index - 1].tasks.every((t: Task) => t.completed));
                      
                      return (
                        <div 
                          key={phase.id} 
                          className="relative z-10 flex flex-col items-center cursor-pointer group"
                          onClick={() => {
                            const el = document.getElementById(phase.id);
                            if (el) {
                              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              if (!expandedPhases[phase.id]) {
                                togglePhase(phase.id);
                              }
                            }
                          }}
                        >
                          <div className={`w-6 h-6 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 sm:border-4 transition-colors duration-300 group-hover:scale-110 ${
                            isComplete 
                              ? 'bg-green-500 border-green-100 text-white' 
                              : isCurrent 
                                ? 'bg-blue-600 border-blue-100 text-white shadow-md shadow-blue-200' 
                                : 'bg-white border-slate-200 text-slate-400'
                          }`}>
                            {isComplete ? <CheckCircle2 className="w-3 h-3 sm:w-5 sm:h-5" /> : <span className="text-[10px] sm:text-base font-bold">{index + 1}</span>}
                          </div>
                          <span className={`hidden md:block absolute top-12 text-xs font-medium whitespace-nowrap mt-1 ${isComplete ? 'text-green-600' : isCurrent ? 'text-blue-600' : 'text-slate-400'}`}>
                            {phase.title.split('.')[1]?.trim() || phase.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </header>

            <div className="p-4 sm:p-8 max-w-4xl mx-auto w-full space-y-4 sm:space-y-6">
              {selectedChecklist.phases.map((phase: Phase) => {
                const phaseCompletedTasks = phase.tasks.filter(t => t.completed).length;
                const phaseTotalTasks = phase.tasks.length;
                const isPhaseComplete = phaseCompletedTasks === phaseTotalTasks;
                const isExpanded = expandedPhases[phase.id];

                return (
                  <div 
                    key={phase.id} 
                    id={phase.id}
                    className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-colors duration-300 scroll-mt-24 ${
                      isPhaseComplete ? 'border-green-200 bg-green-50/30' : 'border-slate-200'
                    }`}
                  >
                    <button 
                      onClick={() => togglePhase(phase.id)}
                      className="w-full px-4 py-3 sm:px-5 sm:py-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className={`p-2 rounded-lg flex-shrink-0 ${isPhaseComplete ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {renderIcon(phase.iconName)}
                        </div>
                        <div className="flex-1 min-w-0 pr-2 sm:pr-4">
                          <h2 className="text-base sm:text-lg font-bold text-slate-800 truncate">{phase.title}</h2>
                          <div className="mt-1.5 sm:mt-2 flex items-center gap-2 sm:gap-3">
                            <div className="flex-1 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${isPhaseComplete ? 'bg-green-500' : 'bg-blue-500'}`} 
                                style={{ width: `${phaseTotalTasks > 0 ? (phaseCompletedTasks / phaseTotalTasks) * 100 : 0}%` }} 
                              />
                            </div>
                            <span className="text-[10px] sm:text-xs font-medium text-slate-500 whitespace-nowrap">
                              {phaseCompletedTasks} / {phaseTotalTasks}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 sm:space-x-4">
                        {isPhaseComplete && (
                          <span className="text-[10px] sm:text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full">
                            完了
                          </span>
                        )}
                        <div className="text-slate-400">
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </div>
                    </button>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-slate-100 px-3 py-3 sm:px-4 sm:py-4 bg-slate-50/50">
                            
                            {/* Factors Section */}
                            {phase.factors && phase.factors.length > 0 && (
                              <div className="mb-4 sm:mb-6 bg-white p-4 sm:p-5 rounded-lg border border-slate-200 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="text-sm font-bold text-slate-700 flex items-center">
                                    <Settings className="w-4 h-4 mr-1.5 text-slate-500"/>
                                    案件詳細設定
                                  </h4>
                                  {phase.id === 'phase-1' && (
                                    <button
                                      onClick={downloadHearingSheet}
                                      className="flex items-center space-x-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2.5 py-1.5 rounded transition-colors border border-blue-200"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      <span>シート出力</span>
                                    </button>
                                  )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                                  {phase.factors.map(factor => (
                                    <div key={factor.id} className={`space-y-2 ${factor.type === 'textarea' || factor.type === 'checkbox_group' ? 'md:col-span-2' : ''}`}>
                                      <label className="text-xs font-semibold text-slate-600">{factor.title}</label>
                                      
                                      {factor.type === 'text' && (
                                        <input 
                                          type="text" 
                                          value={factor.value || ''} 
                                          onChange={(e) => handleFactorChange(phase.id, factor.id, e.target.value)} 
                                          className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" 
                                          placeholder={factor.placeholder} 
                                        />
                                      )}

                                      {factor.type === 'textarea' && (
                                        <textarea 
                                          value={factor.value || ''} 
                                          onChange={(e) => handleFactorChange(phase.id, factor.id, e.target.value)} 
                                          className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition-shadow resize-y min-h-[80px]" 
                                          placeholder={factor.placeholder} 
                                        />
                                      )}
                                      
                                      {factor.type === 'select' && (
                                        <select 
                                          value={factor.value || ''} 
                                          onChange={(e) => handleFactorChange(phase.id, factor.id, e.target.value)} 
                                          className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-shadow"
                                        >
                                          <option value="">選択してください</option>
                                          {factor.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                      )}
                                      
                                      {factor.type === 'checkbox_group' && (
                                        <div className="flex flex-wrap gap-2">
                                          {factor.options?.map(opt => {
                                            const isChecked = (factor.value as string[] || []).includes(opt);
                                            return (
                                              <label key={opt} className={`flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-md border cursor-pointer transition-colors ${isChecked ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                                <input 
                                                  type="checkbox" 
                                                  className="hidden" 
                                                  checked={isChecked} 
                                                  onChange={(e) => {
                                                    const current = factor.value as string[] || [];
                                                    const next = e.target.checked ? [...current, opt] : current.filter(c => c !== opt);
                                                    handleFactorChange(phase.id, factor.id, next);
                                                  }} 
                                                />
                                                <div className={`w-3 h-3 rounded-sm border flex items-center justify-center transition-colors ${isChecked ? 'bg-blue-500 border-blue-500' : 'border-slate-300'}`}>
                                                  {isChecked && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                                                </div>
                                                <span>{opt}</span>
                                              </label>
                                            )
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Tasks Section */}
                            <div>
                              <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center">
                                <CheckSquare className="w-4 h-4 mr-1.5 text-slate-500"/>
                                基本タスク
                              </h4>
                              <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                                {phase.tasks.map((task, index) => (
                                  <div 
                                    key={task.id}
                                    onClick={() => toggleTask(phase.id, task.id)}
                                    className={`group flex items-start space-x-3 sm:space-x-4 p-3 sm:p-4 cursor-pointer transition-all duration-200 ${
                                      index !== phase.tasks.length - 1 ? 'border-b border-slate-100' : ''
                                    } ${
                                      task.completed 
                                        ? 'bg-slate-50 hover:bg-slate-100' 
                                        : 'hover:bg-blue-50/50'
                                    }`}
                                  >
                                    <div className="flex-shrink-0 mt-0.5">
                                      {task.completed ? (
                                        <motion.div
                                          initial={{ scale: 0.8 }}
                                          animate={{ scale: 1 }}
                                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                        >
                                          <CheckCircle2 className="w-6 h-6 text-green-500" />
                                        </motion.div>
                                      ) : (
                                        <Circle className="w-6 h-6 text-slate-300 group-hover:text-blue-400 transition-colors" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm sm:text-base font-medium transition-colors duration-200 ${
                                        task.completed ? 'text-slate-500 line-through' : 'text-slate-800'
                                      }`}>
                                        {task.title}
                                      </p>
                                      <p className={`text-xs sm:text-sm mt-1 transition-colors duration-200 ${
                                        task.completed ? 'text-slate-400' : 'text-slate-600'
                                      }`}>
                                        {task.description}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 p-4">
            <div className="text-center">
              <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm sm:text-base">左側のメニューからお客様を選択するか、<br/>新しく追加してください。</p>
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="mt-6 md:hidden px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium shadow-sm"
              >
                メニューを開く
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
