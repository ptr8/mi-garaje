import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowLeft,
  BarChart3,
  CalendarCheck,
  Car,
  Home,
  Pencil,
  Plus,
  Trash2,
  Wrench,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api, money, today } from './api';
import './index.css';

const emptyVehicle = { name: '', plate: '', type: 'Coche', current_km: 0, notes: '' };
const emptyItv = { vehicle_id: '', last_date: today(), next_date: today(), result: 'Favorable', price: 0, observations: '' };
const emptyMaintenance = {
  vehicle_id: '',
  date: today(),
  km: 0,
  category: 'Aceite',
  description: '',
  price: 0,
  provider: '',
  notes: '',
};

function App() {
  const [tab, setTab] = useState('home');
  const [vehicles, setVehicles] = useState([]);
  const [itv, setItv] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [dashboard, setDashboard] = useState({ upcomingItv: [], latestMaintenance: [], totalSpent: 0 });
  const [stats, setStats] = useState({ byVehicle: [], byCategory: [], monthly: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function refresh() {
    setError('');
    const [vehiclesData, itvData, maintenanceData, dashboardData, statsData] = await Promise.all([
      api('/vehicles'),
      api('/itv'),
      api('/maintenance'),
      api('/dashboard'),
      api('/stats'),
    ]);
    setVehicles(vehiclesData);
    setItv(itvData);
    setMaintenance(maintenanceData);
    setDashboard(dashboardData);
    setStats(statsData);
  }

  useEffect(() => {
    refresh().catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  const pages = {
    home: <HomeView dashboard={dashboard} loading={loading} />,
    vehicles: <VehiclesView vehicles={vehicles} itv={itv} maintenance={maintenance} onChange={refresh} />,
    stats: <StatsView stats={stats} />,
  };

  return (
    <div className="min-h-screen bg-mist text-ink">
      <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 pb-24 pt-5">
        <header className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-moss">Mi Garaje</p>
            <h1 className="text-2xl font-bold">Mantenimiento privado</h1>
          </div>
          <div className="rounded-full bg-ink px-3 py-2 text-sm font-semibold text-white">
            {vehicles.length}
          </div>
        </header>

        {error && <div className="mb-4 rounded-md border border-coral bg-white p-3 text-sm text-coral">{error}</div>}
        {pages[tab]}
      </main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 border-t border-line bg-white/95 backdrop-blur">
        <div className="mx-auto grid max-w-xl grid-cols-3 px-2 py-2">
          <NavButton icon={Home} label="Inicio" active={tab === 'home'} onClick={() => setTab('home')} />
          <NavButton icon={Car} label="Vehículos" active={tab === 'vehicles'} onClick={() => setTab('vehicles')} />
          <NavButton icon={BarChart3} label="Estadísticas" active={tab === 'stats'} onClick={() => setTab('stats')} />
        </div>
      </nav>
    </div>
  );
}

function NavButton({ icon: Icon, label, active, onClick }) {
  return (
    <button
      className={`flex flex-col items-center gap-1 rounded-md px-2 py-2 text-xs font-semibold ${
        active ? 'bg-ink text-white' : 'text-moss'
      }`}
      onClick={onClick}
      type="button"
    >
      <Icon size={18} />
      {label}
    </button>
  );
}

function HomeView({ dashboard, loading }) {
  return (
    <section className="space-y-4">
      <MetricCard label="Gasto total" value={money.format(dashboard.totalSpent || 0)} />
      <Panel title="Próximas ITV">
        <RecordList
          empty={loading ? 'Cargando...' : 'No hay ITV próximas'}
          items={dashboard.upcomingItv}
          render={(item) => (
            <>
              <strong>{item.vehicle_name}</strong>
              <span>{formatDate(item.next_date)} · {item.result}</span>
            </>
          )}
        />
      </Panel>
      <Panel title="Últimos mantenimientos">
        <RecordList
          empty={loading ? 'Cargando...' : 'No hay mantenimientos'}
          items={dashboard.latestMaintenance}
          render={(item) => (
            <>
              <strong>{item.vehicle_name}</strong>
              <span>{formatDate(item.date)} · {item.category} · {money.format(item.price)}</span>
            </>
          )}
        />
      </Panel>
    </section>
  );
}

function VehiclesView({ vehicles, itv, maintenance, onChange }) {
  const [selectedId, setSelectedId] = useState(null);
  const [showNewVehicle, setShowNewVehicle] = useState(vehicles.length === 0);
  const [vehicleForm, setVehicleForm] = useState(emptyVehicle);
  const [editingVehicle, setEditingVehicle] = useState(false);
  const [activeForm, setActiveForm] = useState(null);
  const [itvForm, setItvForm] = useState(emptyItv);
  const [maintenanceForm, setMaintenanceForm] = useState(emptyMaintenance);
  const [editingItvId, setEditingItvId] = useState(null);
  const [editingMaintenanceId, setEditingMaintenanceId] = useState(null);

  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedId);
  const vehicleItv = itv.filter((record) => record.vehicle_id === selectedId);
  const vehicleMaintenance = maintenance.filter((record) => record.vehicle_id === selectedId);
  const vehicleSpent = [...vehicleItv, ...vehicleMaintenance].reduce((sum, item) => sum + Number(item.price || 0), 0);

  useEffect(() => {
    if (vehicles.length === 0) {
      setSelectedId(null);
      setShowNewVehicle(true);
    } else if (selectedId && !vehicles.some((vehicle) => vehicle.id === selectedId)) {
      setSelectedId(null);
    }
  }, [vehicles, selectedId]);

  async function submitVehicle(event) {
    event.preventDefault();
    const saved = await api(editingVehicle ? `/vehicles/${selectedId}` : '/vehicles', {
      method: editingVehicle ? 'PUT' : 'POST',
      body: JSON.stringify(vehicleForm),
    });
    setVehicleForm(emptyVehicle);
    setEditingVehicle(false);
    setShowNewVehicle(false);
    await onChange();
    setSelectedId(saved.id);
  }

  async function removeVehicle(id) {
    if (!window.confirm('¿Borrar este vehículo y todo su historial?')) return;
    await api(`/vehicles/${id}`, { method: 'DELETE' });
    setSelectedId(null);
    await onChange();
  }

  function startVehicleEdit(vehicle) {
    setVehicleForm(vehicle);
    setEditingVehicle(true);
    setShowNewVehicle(true);
  }

  function startItvCreate() {
    setEditingItvId(null);
    setItvForm({ ...emptyItv, vehicle_id: selectedId });
    setActiveForm('itv');
  }

  function startMaintenanceCreate() {
    setEditingMaintenanceId(null);
    setMaintenanceForm({ ...emptyMaintenance, vehicle_id: selectedId, km: selectedVehicle.current_km });
    setActiveForm('maintenance');
  }

  async function submitItv(event) {
    event.preventDefault();
    await api(editingItvId ? `/itv/${editingItvId}` : '/itv', {
      method: editingItvId ? 'PUT' : 'POST',
      body: JSON.stringify({ ...itvForm, vehicle_id: selectedId }),
    });
    setActiveForm(null);
    setEditingItvId(null);
    setItvForm(emptyItv);
    await onChange();
  }

  async function submitMaintenance(event) {
    event.preventDefault();
    await api(editingMaintenanceId ? `/maintenance/${editingMaintenanceId}` : '/maintenance', {
      method: editingMaintenanceId ? 'PUT' : 'POST',
      body: JSON.stringify({ ...maintenanceForm, vehicle_id: selectedId }),
    });
    setActiveForm(null);
    setEditingMaintenanceId(null);
    setMaintenanceForm(emptyMaintenance);
    await onChange();
  }

  async function removeItv(id) {
    if (!window.confirm('¿Borrar este registro de ITV?')) return;
    await api(`/itv/${id}`, { method: 'DELETE' });
    await onChange();
  }

  async function removeMaintenance(id) {
    if (!window.confirm('¿Borrar este mantenimiento?')) return;
    await api(`/maintenance/${id}`, { method: 'DELETE' });
    await onChange();
  }

  if (selectedVehicle) {
    return (
      <section className="space-y-4">
        <button
          className="flex items-center gap-2 text-sm font-bold text-moss"
          type="button"
          onClick={() => {
            setSelectedId(null);
            setShowNewVehicle(false);
            setActiveForm(null);
          }}
        >
          <ArrowLeft size={18} />
          Volver a vehículos
        </button>

        <section className="rounded-md bg-ink p-5 text-white shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-white/70">{selectedVehicle.type}</p>
              <h2 className="text-2xl font-bold">{selectedVehicle.name}</h2>
              <p className="mt-1 text-sm text-white/80">{selectedVehicle.plate} · {selectedVehicle.current_km} km</p>
            </div>
            <CardActions
              light
              onEdit={() => startVehicleEdit(selectedVehicle)}
              onDelete={() => removeVehicle(selectedVehicle.id)}
            />
          </div>
          {selectedVehicle.notes && <p className="mt-4 text-sm text-white/85">{selectedVehicle.notes}</p>}
        </section>

        <div className="grid grid-cols-2 gap-3">
          <button className="flex items-center justify-center gap-2 rounded-md bg-petrol px-3 py-3 font-bold text-white" type="button" onClick={startItvCreate}>
            <CalendarCheck size={18} />
            Añadir ITV
          </button>
          <button className="flex items-center justify-center gap-2 rounded-md bg-moss px-3 py-3 font-bold text-white" type="button" onClick={startMaintenanceCreate}>
            <Wrench size={18} />
            Añadir mantenimiento
          </button>
        </div>

        {showNewVehicle && (
          <Panel title="Editar vehículo">
            <VehicleForm form={vehicleForm} setForm={setVehicleForm} onSubmit={submitVehicle} editing />
          </Panel>
        )}

        {activeForm === 'itv' && (
          <Panel title={editingItvId ? 'Editar ITV' : 'Nueva ITV'}>
            <ItvForm form={itvForm} setForm={setItvForm} onSubmit={submitItv} editing={editingItvId} />
          </Panel>
        )}

        {activeForm === 'maintenance' && (
          <Panel title={editingMaintenanceId ? 'Editar mantenimiento' : 'Nuevo mantenimiento'}>
            <MaintenanceForm form={maintenanceForm} setForm={setMaintenanceForm} onSubmit={submitMaintenance} editing={editingMaintenanceId} />
          </Panel>
        )}

        <MetricCard label="Gastado en este vehículo" value={money.format(vehicleSpent)} />

        <Panel title="ITV">
          <RecordList
            empty="No hay ITV registradas para este vehículo"
            items={vehicleItv}
            render={(record) => (
              <HistoryRow
                title={`${formatDate(record.last_date)} → ${formatDate(record.next_date)}`}
                detail={`${record.result} · ${money.format(record.price)}`}
                note={record.observations}
                onEdit={() => {
                  setEditingItvId(record.id);
                  setItvForm(record);
                  setActiveForm('itv');
                }}
                onDelete={() => removeItv(record.id)}
              />
            )}
          />
        </Panel>

        <Panel title="Mantenimientos">
          <RecordList
            empty="No hay mantenimientos registrados para este vehículo"
            items={vehicleMaintenance}
            render={(record) => (
              <HistoryRow
                title={record.description}
                detail={`${formatDate(record.date)} · ${record.category} · ${money.format(record.price)}`}
                note={record.provider || record.notes}
                onEdit={() => {
                  setEditingMaintenanceId(record.id);
                  setMaintenanceForm(record);
                  setActiveForm('maintenance');
                }}
                onDelete={() => removeMaintenance(record.id)}
              />
            )}
          />
        </Panel>
      </section>
    );
  }

  return (
    <CrudSection title="Vehículos" icon={Car}>
      {showNewVehicle && (
        <VehicleForm
          form={vehicleForm}
          setForm={setVehicleForm}
          onSubmit={submitVehicle}
          editing={editingVehicle}
        />
      )}

      {!showNewVehicle && (
        <button className="flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 font-bold text-white" type="button" onClick={() => setShowNewVehicle(true)}>
          <Plus size={18} />
          Añadir vehículo
        </button>
      )}

      <div className="space-y-3">
        {vehicles.map((vehicle) => (
          <button
            key={vehicle.id}
            className="w-full rounded-md border border-line bg-white p-4 text-left shadow-soft"
            type="button"
            onClick={() => setSelectedId(vehicle.id)}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bold">{vehicle.name}</h3>
                <p className="text-sm text-moss">{vehicle.plate} · {vehicle.type} · {vehicle.current_km} km</p>
              </div>
              <span className="rounded-md bg-mist px-2 py-1 text-xs font-bold text-moss">Abrir</span>
            </div>
          </button>
        ))}
      </div>
    </CrudSection>
  );
}

function StatsView({ stats }) {
  return (
    <section className="space-y-4">
      <ChartPanel title="Gasto por vehículo" data={stats.byVehicle} type="bar" />
      <ChartPanel title="Gasto por categoría" data={stats.byCategory} type="bar" />
      <ChartPanel title="Evolución mensual" data={stats.monthly} type="line" />
    </section>
  );
}

function ChartPanel({ title, data, type }) {
  return (
    <Panel title={title}>
      <div className="h-64">
        {data.length === 0 ? (
          <Empty text="Aún no hay datos suficientes" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {type === 'line' ? (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis width={48} />
                <Tooltip formatter={(value) => money.format(value)} />
                <Legend />
                <Line type="monotone" dataKey="total" name="Gasto" stroke="#23576a" strokeWidth={3} />
              </LineChart>
            ) : (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis width={48} />
                <Tooltip formatter={(value) => money.format(value)} />
                <Bar dataKey="total" name="Gasto" fill="#4e6b58" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </Panel>
  );
}

function VehicleForm({ form, setForm, onSubmit, editing }) {
  return (
    <FormShell onSubmit={onSubmit} submitLabel={editing ? 'Guardar vehículo' : 'Añadir vehículo'}>
      <Input label="Nombre" value={form.name} onChange={(name) => setForm({ ...form, name })} required />
      <Input label="Matrícula" value={form.plate} onChange={(plate) => setForm({ ...form, plate })} required />
      <Input label="Tipo" value={form.type} onChange={(type) => setForm({ ...form, type })} required />
      <Input label="Kilómetros actuales" type="number" value={form.current_km} onChange={(current_km) => setForm({ ...form, current_km })} />
      <Textarea label="Notas" value={form.notes} onChange={(notes) => setForm({ ...form, notes })} />
    </FormShell>
  );
}

function ItvForm({ form, setForm, onSubmit, editing }) {
  return (
    <FormShell onSubmit={onSubmit} submitLabel={editing ? 'Guardar ITV' : 'Añadir ITV'}>
      <Input label="Última ITV" type="date" value={form.last_date} onChange={(last_date) => setForm({ ...form, last_date })} required />
      <Input label="Próxima ITV" type="date" value={form.next_date} onChange={(next_date) => setForm({ ...form, next_date })} required />
      <Input label="Resultado" value={form.result} onChange={(result) => setForm({ ...form, result })} required />
      <Input label="Precio" type="number" step="0.01" value={form.price} onChange={(price) => setForm({ ...form, price })} />
      <Textarea label="Observaciones" value={form.observations} onChange={(observations) => setForm({ ...form, observations })} />
    </FormShell>
  );
}

function MaintenanceForm({ form, setForm, onSubmit, editing }) {
  return (
    <FormShell onSubmit={onSubmit} submitLabel={editing ? 'Guardar mantenimiento' : 'Añadir mantenimiento'}>
      <Input label="Fecha" type="date" value={form.date} onChange={(date) => setForm({ ...form, date })} required />
      <Input label="Kilómetros" type="number" value={form.km} onChange={(km) => setForm({ ...form, km })} />
      <Input label="Categoría" value={form.category} onChange={(category) => setForm({ ...form, category })} required />
      <Input label="Descripción" value={form.description} onChange={(description) => setForm({ ...form, description })} required />
      <Input label="Precio" type="number" step="0.01" value={form.price} onChange={(price) => setForm({ ...form, price })} />
      <Input label="Taller/proveedor" value={form.provider} onChange={(provider) => setForm({ ...form, provider })} />
      <Textarea label="Notas" value={form.notes} onChange={(notes) => setForm({ ...form, notes })} />
    </FormShell>
  );
}

function CrudSection({ title, icon: Icon, children }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Icon size={22} />
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function FormShell({ children, onSubmit, submitLabel }) {
  return (
    <form className="space-y-3 rounded-md border border-line bg-white p-4 shadow-soft" onSubmit={onSubmit}>
      {children}
      <button className="flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 font-bold text-white" type="submit">
        <Plus size={18} />
        {submitLabel}
      </button>
    </form>
  );
}

function Input({ label, onChange, ...props }) {
  return (
    <label className="block text-sm font-semibold text-moss">
      {label}
      <input
        className="mt-1 w-full rounded-md border border-line bg-mist px-3 py-3 text-base text-ink outline-none focus:border-petrol"
        onChange={(event) => onChange(event.target.value)}
        {...props}
      />
    </label>
  );
}

function Textarea({ label, value, onChange }) {
  return (
    <label className="block text-sm font-semibold text-moss">
      {label}
      <textarea
        className="mt-1 min-h-20 w-full rounded-md border border-line bg-mist px-3 py-3 text-base text-ink outline-none focus:border-petrol"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Panel({ title, children }) {
  return (
    <section className="rounded-md border border-line bg-white p-4 shadow-soft">
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function MetricCard({ label, value }) {
  return (
    <section className="rounded-md bg-ink p-5 text-white shadow-soft">
      <p className="text-sm text-white/70">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </section>
  );
}

function CardActions({ onEdit, onDelete, light = false }) {
  return (
    <div className="flex shrink-0 gap-2">
      <button className={`rounded-md border p-2 ${light ? 'border-white/30 text-white' : 'border-line text-petrol'}`} type="button" onClick={onEdit} aria-label="Editar">
        <Pencil size={17} />
      </button>
      <button className={`rounded-md border p-2 ${light ? 'border-white/30 text-white' : 'border-line text-coral'}`} type="button" onClick={onDelete} aria-label="Borrar">
        <Trash2 size={17} />
      </button>
    </div>
  );
}

function HistoryRow({ title, detail, note, onEdit, onDelete }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <strong>{title}</strong>
        <span>{detail}</span>
        {note && <span className="mt-1 text-ink">{note}</span>}
      </div>
      <CardActions onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}

function RecordList({ items, render, empty }) {
  if (!items.length) return <Empty text={empty} />;
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="flex flex-col rounded-md bg-mist px-3 py-3 text-sm">
          {render(item)}
        </div>
      ))}
    </div>
  );
}

function Empty({ text }) {
  return <p className="rounded-md bg-mist px-3 py-4 text-center text-sm text-moss">{text}</p>;
}

function formatDate(date) {
  return new Intl.DateTimeFormat('es-ES').format(new Date(`${date}T00:00:00`));
}

createRoot(document.getElementById('root')).render(<App />);
