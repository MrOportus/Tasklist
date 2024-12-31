// TaskManager.js
import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  doc 
} from 'firebase/firestore';
import { Sun, Moon, Clock, Calendar, Plus, Trash2, LogOut } from 'lucide-react';
import { auth, db } from './firebase';

const TaskManager = () => {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [darkMode, setDarkMode] = useState(() => 
    JSON.parse(localStorage.getItem('darkMode') || 'false')
  );
  const [resetTime, setResetTime] = useState(() => 
    localStorage.getItem('resetTime') || '08:00'
  );
  const [dailyTasks, setDailyTasks] = useState([]);
  const [monthlyTasks, setMonthlyTasks] = useState([]);
  const [newDailyTask, setNewDailyTask] = useState('');
  const [newMonthlyTask, setNewMonthlyTask] = useState('');
  const [error, setError] = useState('');

  // Persistir preferencias de usuario
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    localStorage.setItem('resetTime', resetTime);
  }, [darkMode, resetTime]);

  // Monitorear autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        loadTasks(user.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  // Reset diario de tareas
  useEffect(() => {
    if (!user) return;

    const checkReset = async () => {
      const now = new Date();
      const [hours, minutes] = resetTime.split(':').map(Number);
      
      if (now.getHours() === hours && now.getMinutes() === minutes) {
        const tasksRef = collection(db, 'tasks');
        const dailyTasksQuery = query(
          tasksRef,
          where('userId', '==', user.uid),
          where('type', '==', 'daily')
        );

        const snapshot = await getDocs(dailyTasksQuery);
        snapshot.docs.forEach(async (doc) => {
          await updateDoc(doc.ref, { completed: false });
        });
      }
    };

    const interval = setInterval(checkReset, 60000);
    return () => clearInterval(interval);
  }, [resetTime, user]);

  const loadTasks = (userId) => {
    const dailyQuery = query(
      collection(db, 'tasks'),
      where('userId', '==', userId),
      where('type', '==', 'daily')
    );

    const monthlyQuery = query(
      collection(db, 'tasks'),
      where('userId', '==', userId),
      where('type', '==', 'monthly')
    );

    const unsubscribeDaily = onSnapshot(dailyQuery, (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDailyTasks(tasks);
    });

    const unsubscribeMonthly = onSnapshot(monthlyQuery, (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMonthlyTasks(tasks);
    });

    return () => {
      unsubscribeDaily();
      unsubscribeMonthly();
    };
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setError('');
    } catch (error) {
      setError('Error al iniciar sesión: ' + error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      setError('Error al cerrar sesión: ' + error.message);
    }
  };

  const addTask = async (text, type) => {
    if (!text.trim() || !user) return;

    try {
      await addDoc(collection(db, 'tasks'), {
        text,
        completed: false,
        type,
        userId: user.uid,
        createdAt: new Date().toISOString(),
        resetTime: type === 'daily' ? resetTime : null
      });
      return true;
    } catch (error) {
      setError('Error al agregar tarea: ' + error.message);
      return false;
    }
  };

  const addDailyTask = async (e) => {
    e.preventDefault();
    if (await addTask(newDailyTask, 'daily')) {
      setNewDailyTask('');
    }
  };

  const addMonthlyTask = async (e) => {
    e.preventDefault();
    if (await addTask(newMonthlyTask, 'monthly')) {
      setNewMonthlyTask('');
    }
  };

  const toggleTaskCompletion = async (taskId, completed) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        completed: !completed
      });
    } catch (error) {
      setError('Error al actualizar tarea: ' + error.message);
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
    } catch (error) {
      setError('Error al eliminar tarea: ' + error.message);
    }
  };

  const TaskList = ({ tasks, onToggle, onDelete }) => (
    <ul className="space-y-2">
      {tasks.map(task => (
        <li key={task.id} className="flex items-center gap-2 p-2 rounded hover:bg-gray-700/10">
          <input
            type="checkbox"
            checked={task.completed}
            onChange={() => onToggle(task.id, task.completed)}
            className="w-5 h-5 rounded"
          />
          <span className={`flex-1 ${task.completed ? 'line-through text-gray-500' : ''}`}>
            {task.text}
          </span>
          <button
            onClick={() => onDelete(task.id)}
            className="ml-auto p-1 text-red-500 hover:text-red-600"
          >
            <Trash2 size={16} />
          </button>
        </li>
      ))}
    </ul>
  );

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-6 text-center">Iniciar Sesión</h2>
          {error && <div className="mb-4 text-red-500 text-sm">{error}</div>}
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div className="mb-6">
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            >
              Iniciar Sesión
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-8 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Gestor de Tareas</h1>
          <div className="flex gap-4 items-center">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              {darkMode ? <Sun size={24} /> : <Moon size={24} />}
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <LogOut size={24} />
            </button>
          </div>
        </div>

        {error && <div className="mb-4 text-red-500 text-sm">{error}</div>}

        <div className={`p-6 rounded-lg mb-8 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Clock size={20} />
              Tareas Diarias
            </h2>
            <select
              value={resetTime}
              onChange={(e) => setResetTime(e.target.value)}
              className={`p-2 rounded ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}
            >
              <option value="08:00">08:00</option>
              <option value="12:00">12:00</option>
              <option value="16:00">16:00</option>
            </select>
          </div>
          
          <form onSubmit={addDailyTask} className="flex gap-2 mb-4">
            <input
              type="text"
              value={newDailyTask}
              onChange={(e) => setNewDailyTask(e.target.value)}
              placeholder="Nueva tarea diaria"
              className={`flex-1 p-2 rounded ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'} placeholder-gray-400`}
            />
            <button
              type="submit"
              className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
            >
              <Plus size={20} />
            </button>
          </form>

          <TaskList 
            tasks={dailyTasks}
            onToggle={toggleTaskCompletion}
            onDelete={deleteTask}
          />
        </div>

        <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Calendar size={20} />
            Tareas Mensuales
          </h2>
          
          <form onSubmit={addMonthlyTask} className="flex gap-2 mb-4">
            <input
              type="text"
              value={newMonthlyTask}
              onChange={(e) => setNewMonthlyTask(e.target.value)}
              placeholder="Nueva tarea mensual"
              className={`flex-1 p-2 rounded ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'} placeholder-gray-400`}
            />
            <button
              type="submit"
              className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
            >
              <Plus size={20} />
            </button>
          </form>

          <TaskList 
            tasks={monthlyTasks}
            onToggle={toggleTaskCompletion}
            onDelete={deleteTask}
          />
        </div>
      </div>
    </div>
  );
};

export default TaskManager;