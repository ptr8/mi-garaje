import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowLeft,
  BarChart3,
  Bike,
  Bus,
  CalendarCheck,
  Car,
  Home,
  Pencil,
  Plus,
  Settings,
  Trash2,
  Tractor,
  Truck,
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

const DEFAULT_ITV_CATEGORIES = [
  { value: 'particular_turismo', label: 'Particular turismo / autocaravana', firstMonths: 48, intervals: '4:24,10:12' },
  { value: 'particular_moto', label: 'Particular motocicleta / quad', firstMonths: 48, intervals: '4:24' },
  { value: 'particular_ciclomotor', label: 'Particular ciclomotor', firstMonths: 36, intervals: '3:24' },
  { value: 'mercancias_ligero', label: 'Mercancias <= 3.500 kg', firstMonths: 24, intervals: '2:24,6:12,10:6' },
  { value: 'transporte_personas', label: 'Transporte de personas / taxi / VTC', firstMonths: 12, intervals: '0:12,5:6' },
  { value: 'autoescuela', label: 'Autoescuela', firstMonths: 24, intervals: '2:12,5:6' },
  { value: 'mercancias_pesado', label: 'Mercancias > 3.500 kg', firstMonths: 12, intervals: '0:12,10:6' },
  { value: 'remolque_pesado', label: 'Remolque / caravana > 750 kg', firstMonths: 72, intervals: '6:24' },
  { value: 'remolque_ligero', label: 'Remolque ligero <= 750 kg', firstMonths: 0, intervals: '', exempt: true },
  { value: 'agricola_rapido', label: 'Agricola > 40 km/h', firstMonths: 48, intervals: '4:24,16:12' },
  { value: 'agricola_lento', label: 'Agricola <= 40 km/h', firstMonths: 96, intervals: '8:24,16:12' },
  { value: 'especial_obras_servicios', label: 'Especial obras y servicios', firstMonths: 48, intervals: '4:24,10:12' },
  { value: 'historico_motocicleta', label: 'Historico motocicleta', firstMonths: 48, intervals: '0:48' },
  { value: 'historico_resto', label: 'Historico resto de categorias', firstMonths: 360, intervals: '30:24,40:36,45:48', exemptFromYears: 60 },
];

const DEFAULT_VEHICLE_TYPES = [
  { value: 'car', label: 'Turismo', icon: 'car' },
  { value: 'motorhome', label: 'Autocaravana', icon: 'car' },
  { value: 'van', label: 'Furgoneta', icon: 'truck' },
  { value: 'light_truck', label: 'Camion ligero', icon: 'truck' },
  { value: 'heavy_truck', label: 'Camion pesado', icon: 'truck' },
  { value: 'tractor_head', label: 'Cabeza tractora', icon: 'truck' },
  { value: 'motorcycle', label: 'Motocicleta', icon: 'motorcycle' },
  { value: 'moped', label: 'Ciclomotor', icon: 'motorcycle' },
  { value: 'quad', label: 'Quad / triciclo', icon: 'motorcycle' },
  { value: 'bus', label: 'Autobus', icon: 'bus' },
  { value: 'trailer_light', label: 'Remolque ligero', icon: 'car' },
  { value: 'trailer_heavy', label: 'Remolque / caravana pesado', icon: 'car' },
  { value: 'tractor', label: 'Tractor / maquinaria agricola', icon: 'tractor' },
  { value: 'special', label: 'Vehiculo especial', icon: 'truck' },
];

const emptyVehicle = {
  brand: '',
  model: '',
  plate: '',
  vehicle_kind: 'car',
  itv_category: 'particular_turismo',
  type: 'particular_turismo',
  registration_date: today(),
  insurance_expiry: '',
  insurance_company: '',
  insurance_price: 0,
  current_km: 0,
  notes: '',
};
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
  const [vehicleAction, setVehicleAction] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [itv, setItv] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [itvCategories, setItvCategories] = useState(DEFAULT_ITV_CATEGORIES);
  const [dashboard, setDashboard] = useState({ upcomingItv: [], upcomingInsurance: [], latestMaintenance: [], totalSpent: 0 });
  const [stats, setStats] = useState({ byVehicle: [], byCategory: [], monthly: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function refresh() {
    setError('');
    const [vehiclesData, itvData, maintenanceData, dashboardData, statsData, categoriesData] = await Promise.all([
      api('/vehicles'),
      api('/itv'),
      api('/maintenance'),
      api('/dashboard'),
      api('/stats'),
      api('/settings/itv_categories'),
    ]);
    setVehicles(vehiclesData);
    setItv(itvData);
    setMaintenance(maintenanceData);
    setDashboard(dashboardData);
    setStats(statsData);
    if (Array.isArray(categoriesData.value)) {
      setItvCategories(normalizeItvCategories(categoriesData.value));
    }
  }

  useEffect(() => {
    refresh().catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  const pages = {
    home: <HomeView
      dashboard={dashboard}
      loading={loading}
      onOpenItv={(vehicleId) => {
        setVehicleAction({ type: 'itv', vehicleId, token: Date.now() });
        setTab('vehicles');
      }}
      onOpenInsurance={(vehicleId) => {
        setVehicleAction({ type: 'insurance', vehicleId, token: Date.now() });
        setTab('vehicles');
      }}
    />,
    vehicles: (
      <VehiclesView
        vehicles={vehicles}
        itv={itv}
        maintenance={maintenance}
        itvCategories={itvCategories}
        vehicleAction={vehicleAction}
        onVehicleActionHandled={() => setVehicleAction(null)}
        onChange={refresh}
      />
    ),
    stats: <StatsView stats={stats} />,
    settings: <SettingsView itvCategories={itvCategories} setItvCategories={setItvCategories} onChange={refresh} />,
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
        <div className="mx-auto grid max-w-xl grid-cols-4 px-2 py-2">
          <NavButton icon={Home} label="Inicio" active={tab === 'home'} onClick={() => setTab('home')} />
          <NavButton icon={Car} label="Vehículos" active={tab === 'vehicles'} onClick={() => setTab('vehicles')} />
          <NavButton icon={BarChart3} label="Estadísticas" active={tab === 'stats'} onClick={() => setTab('stats')} />
          <NavButton icon={Settings} label="Config" active={tab === 'settings'} onClick={() => setTab('settings')} />
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

function HomeView({ dashboard, loading, onOpenItv, onOpenInsurance }) {
  return (
    <section className="space-y-4">
      <MetricCard label="Gasto total" value={money.format(dashboard.totalSpent || 0)} />
      <Panel title="Próximas ITV">
        <RecordList
          empty={loading ? 'Cargando...' : 'No hay ITV próximas'}
          items={dashboard.upcomingItv}
          itemClassName={(item) => (isItvExpired(item.next_date) ? 'border border-coral bg-coral/10 text-coral' : '')}
          onItemClick={(item) => onOpenItv(item.vehicle_id)}
          render={(item) => (
            <VehicleSummaryBlock
              vehicle={item}
              danger={isItvExpired(item.next_date)}
              detail={`${formatDate(item.next_date)} - ${isItvExpired(item.next_date) ? 'ITV caducada' : 'Proxima ITV'}`}
            />
          )}
        />
      </Panel>
      <Panel title="Próximos seguros">
        <RecordList
          empty={loading ? 'Cargando...' : 'No hay seguros registrados'}
          items={dashboard.upcomingInsurance || []}
          itemClassName={(item) => (isInsuranceExpired(item.insurance_expiry) ? 'border border-coral bg-coral/10 text-coral' : '')}
          onItemClick={(item) => onOpenInsurance(item.vehicle_id)}
          render={(item) => (
            <VehicleSummaryBlock
              vehicle={item}
              danger={isInsuranceExpired(item.insurance_expiry)}
              detail={`${formatDate(item.insurance_expiry)} - ${item.insurance_company || 'Sin compania'}${Number(item.insurance_price || 0) > 0 ? ` - ${money.format(item.insurance_price)}` : ''}`}
            />
          )}
        />
      </Panel>
      <Panel title="Últimos mantenimientos">
        <RecordList
          empty={loading ? 'Cargando...' : 'No hay mantenimientos'}
          items={dashboard.latestMaintenance}
          render={(item) => (
            <VehicleSummaryBlock
              vehicle={item}
              detail={`${formatDate(item.date)} - ${item.category} - ${money.format(item.price)}`}
            />
          )}
        />
      </Panel>
    </section>
  );
}

function VehiclesView({ vehicles, itv, maintenance, itvCategories, vehicleAction, onVehicleActionHandled, onChange }) {
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
  const selectedItvDate = selectedVehicle ? calculateUpcomingItv(selectedVehicle, vehicleItv, itvCategories) : '';
  const selectedItvExpired = isItvExpired(selectedItvDate);

  useEffect(() => {
    if (vehicles.length === 0) {
      setSelectedId(null);
      setShowNewVehicle(true);
    } else if (selectedId && !vehicles.some((vehicle) => vehicle.id === selectedId)) {
      setSelectedId(null);
    }
  }, [vehicles, selectedId]);

  useEffect(() => {
    if (!vehicleAction) return;
    if (vehicleAction.type === 'itv') {
      openItvCreate(vehicleAction.vehicleId, true);
    }
    if (vehicleAction.type === 'insurance') {
      openInsuranceRenewal(vehicleAction.vehicleId);
    }
    onVehicleActionHandled();
  }, [vehicleAction]);

  async function submitVehicle(event) {
    event.preventDefault();
    const vehiclePayload = {
      ...vehicleForm,
      type: vehicleForm.itv_category,
      name: formatVehicleName(vehicleForm),
    };
    const saved = await api(editingVehicle ? `/vehicles/${selectedId}` : '/vehicles', {
      method: editingVehicle ? 'PUT' : 'POST',
      body: JSON.stringify(vehiclePayload),
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
    setVehicleForm(normalizeVehicleForm(vehicle));
    setEditingVehicle(true);
    setShowNewVehicle(true);
  }

  function openInsuranceRenewal(vehicleId) {
    const vehicle = vehicles.find((item) => item.id === vehicleId);
    if (!vehicle) return;
    setSelectedId(vehicleId);
    setActiveForm(null);
    setEditingVehicle(true);
    setShowNewVehicle(true);
    setVehicleForm(renewInsuranceForm(normalizeVehicleForm(vehicle)));
  }

  function startItvCreate() {
    openItvCreate(selectedId, true);
  }

  function openItvCreate(vehicleId, useTodayAsLastDate) {
    const vehicle = vehicles.find((item) => item.id === vehicleId);
    if (!vehicle) return;
    const records = itv.filter((record) => record.vehicle_id === vehicleId);
    const latestItv = latestItvRecord(records);
    const previousDueDate = latestItv?.next_date || calculateFirstItvDate(vehicle, itvCategories);
    const last_date = useTodayAsLastDate ? today() : latestItv?.next_date || vehicle.registration_date || today();
    setEditingItvId(null);
    setSelectedId(vehicleId);
    setShowNewVehicle(false);
    setEditingVehicle(false);
    setItvForm({
      ...emptyItv,
      vehicle_id: vehicleId,
      last_date,
      previous_due_date: previousDueDate,
      next_date: calculateRenewedItvDate(vehicle, last_date, previousDueDate, itvCategories),
      result: 'Favorable',
      price: 0,
    });
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

        <section className={`rounded-md p-5 text-white shadow-soft ${selectedItvExpired ? 'bg-coral' : 'bg-ink'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <VehicleAvatar vehicle={selectedVehicle} light />
              <div className="min-w-0">
                <p className="text-sm text-white/70">{getVehicleTypeLabel(getResolvedVehicleKind(selectedVehicle))} · {getItvCategoryLabel(getVehicleItvCategory(selectedVehicle), itvCategories)}</p>
                <h2 className="break-words text-2xl font-bold">{formatVehicleName(selectedVehicle)}</h2>
                <p className="mt-1 text-sm text-white/80">{selectedVehicle.plate} · {selectedVehicle.current_km} km</p>
                {selectedVehicle.registration_date && (
                  <p className="mt-1 text-sm text-white/80">Matriculado el {formatDate(selectedVehicle.registration_date)}</p>
                )}
              </div>
            </div>
            <CardActions
              light
              onEdit={() => startVehicleEdit(selectedVehicle)}
              onDelete={() => removeVehicle(selectedVehicle.id)}
            />
          </div>
          {selectedItvExpired && (
            <p className="mt-4 rounded-md bg-white/15 px-3 py-2 text-sm font-bold">ITV caducada desde el {formatDate(selectedItvDate)}</p>
          )}
          {hasInsuranceData(selectedVehicle) && (
            <p className="mt-4 rounded-md bg-white/15 px-3 py-2 text-sm font-semibold">
              Seguro: {formatInsuranceSummary(selectedVehicle)}
            </p>
          )}
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
            <VehicleForm form={vehicleForm} setForm={setVehicleForm} onSubmit={submitVehicle} editing itvCategories={itvCategories} />
          </Panel>
        )}

        {activeForm === 'itv' && (
          <Panel title={editingItvId ? 'Editar ITV' : 'Nueva ITV'}>
            <ItvForm form={itvForm} setForm={setItvForm} onSubmit={submitItv} editing={editingItvId} vehicle={selectedVehicle} itvCategories={itvCategories} />
          </Panel>
        )}

        {activeForm === 'maintenance' && (
          <Panel title={editingMaintenanceId ? 'Editar mantenimiento' : 'Nuevo mantenimiento'}>
            <MaintenanceForm form={maintenanceForm} setForm={setMaintenanceForm} onSubmit={submitMaintenance} editing={editingMaintenanceId} />
          </Panel>
        )}

        <MetricCard label="Gastado en este vehículo" value={money.format(vehicleSpent)} />
        <MetricCard label={selectedItvExpired ? 'ITV caducada' : 'Proxima ITV estimada'} value={formatItvDate(selectedItvDate)} tone={selectedItvExpired ? 'danger' : 'default'} />

        <Panel title="ITV">
          <RecordList
            empty="No hay ITV registradas para este vehículo"
            items={vehicleItv}
            itemClassName={(record) => (isItvExpired(record.next_date) ? 'border border-coral bg-coral/10 text-coral' : '')}
            render={(record) => (
              <HistoryRow
                title={`${formatDate(record.last_date)} → ${formatDate(record.next_date)}`}
                detail={`${isItvExpired(record.next_date) ? 'ITV caducada' : record.result} - ${money.format(record.price)}`}
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
          itvCategories={itvCategories}
        />
      )}

      {!showNewVehicle && (
        <button className="flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 font-bold text-white" type="button" onClick={() => setShowNewVehicle(true)}>
          <Plus size={18} />
          Añadir vehículo
        </button>
      )}

      <div className="space-y-3">
        {vehicles.map((vehicle) => {
          const expired = isItvExpired(calculateUpcomingItv(vehicle, itv.filter((record) => record.vehicle_id === vehicle.id), itvCategories));
          return (
          <button
            key={vehicle.id}
            className={`w-full rounded-md border p-4 text-left shadow-soft ${
              expired
                ? 'border-coral bg-coral/10'
                : 'border-line bg-white'
            }`}
            type="button"
            onClick={() => setSelectedId(vehicle.id)}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <VehicleAvatar
                  vehicle={vehicle}
                  danger={expired}
                />
                <div className="min-w-0">
                  <h3 className="truncate font-bold">{formatVehicleSummary(vehicle)}</h3>
                  <p className="truncate text-sm text-moss">
                    {getVehicleTypeLabel(getResolvedVehicleKind(vehicle))} - {vehicle.current_km} km
                  </p>
                  {hasInsuranceData(vehicle) && (
                    <p className={`truncate text-xs ${isInsuranceExpired(vehicle.insurance_expiry) ? 'font-bold text-coral' : 'text-moss'}`}>
                      Seguro: {formatInsuranceSummary(vehicle)}
                    </p>
                  )}
                  {expired && (
                    <p className="mt-1 text-xs font-bold text-coral">ITV caducada</p>
                  )}
                </div>
              </div>
              <span className="rounded-md bg-mist px-2 py-1 text-xs font-bold text-moss">Abrir</span>
            </div>
          </button>
          );
        })}
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

function SettingsView({ itvCategories, setItvCategories, onChange }) {
  const [saving, setSaving] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const safeIndex = Math.min(selectedIndex, Math.max(itvCategories.length - 1, 0));
  const selectedCategory = itvCategories[safeIndex];

  function updateSelectedCategory(field, value) {
    setItvCategories((categories) => categories.map((category, currentIndex) => (
      currentIndex === safeIndex ? { ...category, [field]: value } : category
    )));
  }

  function updateSelectedLabel(label) {
    setItvCategories((categories) => categories.map((category, currentIndex) => {
      if (currentIndex !== safeIndex) return category;
      return {
        ...category,
        label,
        value: category.value.startsWith('categoria-') ? slugifyCategory(label) : category.value,
      };
    }));
  }

  function addCategory() {
    setItvCategories((categories) => {
      const nextCategories = [
        ...categories,
        {
          value: 'categoria-' + Date.now(),
          label: 'Nueva categoria',
          firstMonths: 48,
          intervals: '4:24,10:12',
          exempt: false,
          exemptFromYears: '',
        },
      ];
      setSelectedIndex(nextCategories.length - 1);
      return nextCategories;
    });
  }

  function removeSelectedCategory() {
    setItvCategories((categories) => {
      if (categories.length <= 1) return categories;
      const nextCategories = categories.filter((_, currentIndex) => currentIndex !== safeIndex);
      setSelectedIndex(Math.max(0, safeIndex - 1));
      return nextCategories;
    });
  }

  function restoreDefaults() {
    setItvCategories(DEFAULT_ITV_CATEGORIES);
    setSelectedIndex(0);
  }

  function updateInterval(index, field, value) {
    const intervals = intervalTextToRows(selectedCategory.intervals);
    intervals[index] = { ...intervals[index], [field]: value };
    updateSelectedCategory('intervals', intervalRowsToText(intervals));
  }

  function addInterval() {
    const intervals = intervalTextToRows(selectedCategory.intervals);
    updateSelectedCategory('intervals', intervalRowsToText([...intervals, { fromYears: 0, intervalMonths: 12 }]));
  }

  function removeInterval(index) {
    const intervals = intervalTextToRows(selectedCategory.intervals).filter((_, currentIndex) => currentIndex !== index);
    updateSelectedCategory('intervals', intervalRowsToText(intervals));
  }

  async function saveSettings(event) {
    event.preventDefault();
    setSaving(true);
    await api('/settings/itv_categories', {
      method: 'PUT',
      body: JSON.stringify({ value: normalizeItvCategories(itvCategories) }),
    });
    await onChange();
    setSaving(false);
  }

  if (!selectedCategory) {
    setItvCategories([
      {
        value: 'categoria-' + Date.now(),
        label: 'Nueva categoria',
        firstMonths: 48,
        intervals: '4:24,10:12',
        exempt: false,
        exemptFromYears: '',
      },
    ]);
    return null;
  }

  const intervalRows = intervalTextToRows(selectedCategory.intervals);

  return (
    <section className="space-y-4">
      <CrudSection title="Configuracion" icon={Settings}>
        <form className="space-y-3" onSubmit={saveSettings}>
          <Panel title="Uso / periodicidad ITV">
            <div className="space-y-3 rounded-md bg-mist p-3">
              <Select
                label="Categoria"
                onChange={(value) => setSelectedIndex(Number(value))}
                options={itvCategories.map((category, index) => ({ value: String(index), label: category.label }))}
                value={String(safeIndex)}
              />
              <Input label="Etiqueta visible" value={selectedCategory.label} onChange={updateSelectedLabel} required />
              <Input label="Primera ITV (meses)" type="number" value={selectedCategory.firstMonths} onChange={(firstMonths) => updateSelectedCategory('firstMonths', firstMonths)} />
              <div>
                <Input label="Exento desde anos" type="number" value={selectedCategory.exemptFromYears || ''} onChange={(exemptFromYears) => updateSelectedCategory('exemptFromYears', exemptFromYears)} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-moss">Frecuencia despues de la primera ITV</p>
                {intervalRows.length === 0 && (
                  <Empty text="Sin tramos definidos" />
                )}
                {intervalRows.map((interval, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                    <Input label="Desde anos" type="number" value={interval.fromYears} onChange={(fromYears) => updateInterval(index, 'fromYears', fromYears)} />
                    <Input label="Cada meses" type="number" value={interval.intervalMonths} onChange={(intervalMonths) => updateInterval(index, 'intervalMonths', intervalMonths)} />
                    <button className="rounded-md border border-coral px-3 py-3 text-sm font-bold text-coral" type="button" onClick={() => removeInterval(index)}>
                      Borrar
                    </button>
                  </div>
                ))}
                <button className="rounded-md border border-line bg-white px-3 py-2 text-sm font-bold text-moss" type="button" onClick={addInterval}>
                  Anadir tramo
                </button>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-moss">
                <input
                  checked={Boolean(selectedCategory.exempt)}
                  className="h-5 w-5 accent-petrol"
                  onChange={(event) => updateSelectedCategory('exempt', event.target.checked)}
                  type="checkbox"
                />
                Exento de ITV periodica
              </label>
              <button className="rounded-md border border-coral px-3 py-2 text-sm font-bold text-coral" disabled={itvCategories.length <= 1} type="button" onClick={removeSelectedCategory}>
                Borrar categoria
              </button>
            </div>
          </Panel>

          <div className="grid grid-cols-2 gap-3">
            <button className="rounded-md bg-moss px-3 py-3 font-bold text-white" type="button" onClick={addCategory}>
              Anadir categoria
            </button>
            <button className="rounded-md border border-line bg-white px-3 py-3 font-bold text-moss" type="button" onClick={restoreDefaults}>
              Restaurar base
            </button>
          </div>
          <button className="flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 font-bold text-white" type="submit">
            <Settings size={18} />
            {saving ? 'Guardando...' : 'Guardar configuracion'}
          </button>
        </form>
      </CrudSection>
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

function VehicleForm({ form, setForm, onSubmit, editing, itvCategories }) {
  return (
    <FormShell onSubmit={onSubmit} submitLabel={editing ? 'Guardar vehículo' : 'Añadir vehículo'}>
      <Input label="Marca" value={form.brand} onChange={(brand) => setForm({ ...form, brand })} required />
      <Input label="Modelo" value={form.model} onChange={(model) => setForm({ ...form, model })} required />
      <Input label="Matrícula" value={form.plate} onChange={(plate) => setForm({ ...form, plate })} required />
      <Select label="Tipo de vehiculo" value={form.vehicle_kind} onChange={(vehicle_kind) => setForm({ ...form, vehicle_kind })} options={DEFAULT_VEHICLE_TYPES} required />
      <Select label="Uso / periodicidad ITV" value={form.itv_category} onChange={(itv_category) => setForm({ ...form, itv_category, type: itv_category })} options={itvCategories} required />
      <Input label="Fecha de matriculación" type="date" value={form.registration_date} onChange={(registration_date) => setForm({ ...form, registration_date })} required />
      <Input label="Vence seguro" type="date" value={form.insurance_expiry || ''} onChange={(insurance_expiry) => setForm({ ...form, insurance_expiry })} />
      <Input label="Compañia seguro" value={form.insurance_company || ''} onChange={(insurance_company) => setForm({ ...form, insurance_company })} />
      <Input label="Precio seguro" type="number" step="0.01" value={form.insurance_price || 0} onChange={(insurance_price) => setForm({ ...form, insurance_price })} />
      <button className="rounded-md border border-line bg-white px-3 py-3 text-sm font-bold text-moss" type="button" onClick={() => setForm(renewInsuranceForm(form))}>
        Renovar seguro 1 año
      </button>
      <Input label="Kilómetros actuales" type="number" value={form.current_km} onChange={(current_km) => setForm({ ...form, current_km })} />
      <Textarea label="Notas" value={form.notes} onChange={(notes) => setForm({ ...form, notes })} />
    </FormShell>
  );
}

function ItvForm({ form, setForm, onSubmit, editing, vehicle, itvCategories }) {
  const submitLabel = editing ? 'Guardar ITV' : 'Confirmar ITV';

  return (
    <FormShell onSubmit={onSubmit} submitLabel={submitLabel}>
      <Input
        label="Última ITV"
        type="date"
        value={form.last_date}
        onChange={(last_date) => {
          const next_date = calculateRenewedItvDate(vehicle, last_date, form.previous_due_date, itvCategories);
          setForm({ ...form, last_date, next_date: next_date || form.next_date });
        }}
        required
      />
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
  const handleValueChange = (event) => onChange(event.target.value);
  return (
    <label className="block text-sm font-semibold text-moss">
      {label}
      <input
        className="mt-1 w-full rounded-md border border-line bg-mist px-3 py-3 text-base text-ink outline-none focus:border-petrol"
        onChange={handleValueChange}
        onInput={handleValueChange}
        {...props}
      />
    </label>
  );
}

function Select({ label, options, onChange, ...props }) {
  return (
    <label className="block text-sm font-semibold text-moss">
      {label}
      <select
        className="mt-1 w-full rounded-md border border-line bg-mist px-3 py-3 text-base text-ink outline-none focus:border-petrol"
        onChange={(event) => onChange(event.target.value)}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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

function VehicleSummaryBlock({ vehicle, detail, danger = false }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <VehicleAvatar vehicle={vehicle} danger={danger} />
      <div className="min-w-0">
        <strong className="block truncate">{formatVehicleSummary(vehicle)}</strong>
        <span className="block text-sm">{detail}</span>
      </div>
    </div>
  );
}

function VehicleAvatar({ vehicle, danger = false, light = false }) {
  const Icon = getVehicleIcon(vehicle);
  const toneClass = light
    ? 'bg-white/15 text-white'
    : danger
      ? 'bg-coral/10 text-coral'
      : 'bg-petrol/10 text-petrol';

  return (
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${toneClass}`} aria-hidden="true">
      <Icon size={22} strokeWidth={2.4} />
    </span>
  );
}

function MetricCard({ label, value, tone = 'default' }) {
  return (
    <section className={`rounded-md p-5 text-white shadow-soft ${tone === 'danger' ? 'bg-coral' : 'bg-ink'}`}>
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

function RecordList({ items, render, empty, itemClassName, onItemClick }) {
  if (!items.length) return <Empty text={empty} />;
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const content = render(item);
        const className = `flex w-full flex-col rounded-md bg-mist px-3 py-3 text-sm ${onItemClick ? 'cursor-pointer text-left' : ''} ${itemClassName ? itemClassName(item) : ''}`;

        if (onItemClick) {
          return (
            <button key={item.id} className={className} type="button" onClick={() => onItemClick(item)}>
              {content}
            </button>
          );
        }

        return (
          <div key={item.id} className={className}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

function Empty({ text }) {
  return <p className="rounded-md bg-mist px-3 py-4 text-center text-sm text-moss">{text}</p>;
}

function formatVehicleName(vehicle) {
  const brand = cleanTextValue(vehicle?.brand || vehicle?.vehicle_brand);
  const model = cleanTextValue(vehicle?.model || vehicle?.vehicle_model);
  return [brand, model].filter(Boolean).join(' ') || cleanTextValue(vehicle?.name || vehicle?.vehicle_name) || 'Vehículo';
}

function getItvCategoryLabel(type, categories = DEFAULT_ITV_CATEGORIES) {
  return categories.find((category) => category.value === type)?.label || type || 'Sin tipo';
}

function getVehicleTypeLabel(type) {
  return DEFAULT_VEHICLE_TYPES.find((item) => item.value === type)?.label || 'Vehiculo';
}

function getVehicleIcon(vehicle) {
  const vehicleType = DEFAULT_VEHICLE_TYPES.find((item) => item.value === getResolvedVehicleKind(vehicle));
  return getVehicleKindIcon(vehicleType?.icon || inferVehicleKind(vehicle?.vehicle_kind || vehicle?.vehicle_type));
}

function getVehicleKindIcon(kind) {
  if (kind === 'motorcycle') return Bike;
  if (kind === 'bus') return Bus;
  if (kind === 'truck') return Truck;
  if (kind === 'tractor') return Tractor;
  return Car;
}

function inferVehicleKind(type) {
  const normalized = normalizeType(type);
  if (normalized.includes('turismo') || normalized.includes('autocaravana') || normalized.includes('coche') || normalized.includes('m1')) return 'car';
  if (normalized.includes('ciclomotor') || normalized.includes('motocicleta') || normalized.includes('triciclo') || normalized.includes('quad') || normalized.includes('l1e')) return 'motorcycle';
  if (normalized.includes('autobus') || normalized.includes('autocar') || normalized.includes('m2') || normalized.includes('m3')) return 'bus';
  if (normalized.includes('agricola') || normalized.includes('tractor')) return 'tractor';
  if (normalized.includes('furgon') || normalized.includes('camion') || normalized.includes('pesado') || normalized.includes('cabeza tractora') || normalized.includes('n1') || normalized.includes('n2') || normalized.includes('n3')) return 'truck';
  return 'car';
}

function getVehicleItvCategory(vehicle) {
  return vehicle?.itv_category || vehicle?.type || vehicle?.vehicle_type || '';
}

function getResolvedVehicleKind(vehicle) {
  return vehicle?.vehicle_kind || inferVehicleKind(getVehicleItvCategory(vehicle));
}

function formatPlateAndNotes(plate, notes) {
  return [cleanTextValue(plate), cleanTextValue(notes)].filter(Boolean).join(' - ');
}

function formatVehicleSummary(vehicle) {
  return [formatVehicleName(vehicle), cleanTextValue(vehicle?.vehicle_plate || vehicle?.plate), cleanTextValue(vehicle?.vehicle_notes || vehicle?.notes)]
    .filter(Boolean)
    .join(' - ');
}

function hasInsuranceData(vehicle) {
  return Boolean(cleanTextValue(vehicle?.insurance_expiry) || cleanTextValue(vehicle?.insurance_company) || Number(vehicle?.insurance_price || 0) > 0);
}

function formatInsuranceSummary(vehicle) {
  return [
    cleanTextValue(vehicle?.insurance_company),
    vehicle?.insurance_expiry ? `vence ${formatDate(vehicle.insurance_expiry)}` : '',
    Number(vehicle?.insurance_price || 0) > 0 ? money.format(vehicle.insurance_price) : '',
  ].filter(Boolean).join(' - ');
}

function isInsuranceExpired(date) {
  return isItvExpired(date);
}

function renewInsuranceForm(form) {
  const expiry = parseInputDate(form.insurance_expiry);
  const todayDate = parseInputDate(today());
  const baseDate = expiry && expiry > todayDate ? form.insurance_expiry : today();
  return {
    ...form,
    insurance_expiry: addMonths(baseDate, 12),
  };
}

function normalizeVehicleForm(vehicle) {
  const fallback = splitVehicleName(vehicle.name);
  const itv_category = getVehicleItvCategory(vehicle);
  return {
    ...emptyVehicle,
    ...vehicle,
    brand: vehicle.brand || fallback.brand,
    model: vehicle.model || fallback.model,
    vehicle_kind: getResolvedVehicleKind(vehicle),
    itv_category,
    type: itv_category,
    registration_date: vehicle.registration_date || today(),
    insurance_expiry: vehicle.insurance_expiry || '',
    insurance_company: vehicle.insurance_company || '',
    insurance_price: vehicle.insurance_price || 0,
  };
}

function splitVehicleName(name) {
  const parts = cleanTextValue(name).split(/\s+/).filter(Boolean);
  return {
    brand: parts.shift() || '',
    model: parts.join(' '),
  };
}

function calculateUpcomingItv(vehicle, records, categories = DEFAULT_ITV_CATEGORIES) {
  const latest = latestItvRecord(records);
  if (latest?.next_date) return latest.next_date;
  return calculateFirstItvDate(vehicle, categories);
}

function calculateFirstItvDate(vehicle, categories = DEFAULT_ITV_CATEGORIES) {
  if (!vehicle?.registration_date) return today();
  const rule = getItvRule(getVehicleItvCategory(vehicle), categories);
  if (rule.exempt) return '';
  const age = yearsBetween(vehicle.registration_date, today());
  if (rule.exemptFromYears && age >= rule.exemptFromYears) return '';
  return addMonths(vehicle.registration_date, getFirstInspectionMonths(rule, 0));
}

function calculateNextItvDate(vehicle, lastDate, categories = DEFAULT_ITV_CATEGORIES) {
  if (!lastDate) return calculateFirstItvDate(vehicle, categories);
  const age = yearsBetween(vehicle?.registration_date, lastDate);
  const rule = getItvRule(getVehicleItvCategory(vehicle), categories);
  if (rule.exempt) return '';
  if (rule.exemptFromYears && age >= rule.exemptFromYears) return '';
  return addMonths(lastDate, getItvIntervalMonths(rule, age));
}

function calculateRenewedItvDate(vehicle, inspectionDate, previousDueDate, categories = DEFAULT_ITV_CATEGORIES) {
  if (!inspectionDate) return calculateFirstItvDate(vehicle, categories);
  const baseDate = shouldKeepPreviousItvDueDate(inspectionDate, previousDueDate) ? previousDueDate : inspectionDate;
  return calculateNextItvDate(vehicle, baseDate, categories);
}

function shouldKeepPreviousItvDueDate(inspectionDate, previousDueDate) {
  const inspection = parseInputDate(inspectionDate);
  const due = parseInputDate(previousDueDate);
  if (!inspection || !due) return false;
  const daysBeforeDue = daysBetween(inspection, due);
  return daysBeforeDue >= 0 && daysBeforeDue <= 30;
}

function getFirstInspectionMonths(rule, age) {
  const bracket = getItvBracket(rule, age);
  return bracket?.fromMonths || rule.intervalMonths || 12;
}

function getItvIntervalMonths(rule, age) {
  const interval = getItvBracket(rule, age)?.intervalMonths || rule.intervalMonths || 12;
  return interval > 0 ? interval : 12;
}

function getItvBracket(rule, age) {
  return rule.brackets.find((bracket) => age < bracket.untilYears) || rule.brackets.at(-1);
}

function categoryToRule(category) {
  return {
    exempt: Boolean(category.exempt),
    exemptFromYears: toOptionalNumber(category.exemptFromYears),
    intervalMonths: toIntegerValue(category.firstMonths, 12),
    brackets: parseIntervalText(category.intervals, category.firstMonths),
  };
}

function getItvRule(type = '', categories = DEFAULT_ITV_CATEGORIES) {
  const configured = categories.find((category) => category.value === type);
  if (configured) return categoryToRule(configured);

  const normalized = normalizeType(type);
  if (normalized.includes('historico') && normalized.includes('moto')) {
    return { intervalMonths: 48, brackets: [{ untilYears: Infinity, fromMonths: 48, intervalMonths: 48 }] };
  }
  if (normalized.includes('historico')) {
    return {
      intervalMonths: 24,
      brackets: [
        { untilYears: 30, fromMonths: 0, intervalMonths: 0 },
        { untilYears: 40, fromMonths: 0, intervalMonths: 24 },
        { untilYears: 45, fromMonths: 0, intervalMonths: 36 },
        { untilYears: 60, fromMonths: 0, intervalMonths: 48 },
        { untilYears: Infinity, fromMonths: 0, intervalMonths: 0 },
      ],
      exemptFromYears: 60,
    };
  }
  if (normalized.includes('remolque ligero') || normalized.includes('o1')) {
    return { exempt: true, brackets: [] };
  }
  if (normalized.includes('ciclomotor') || normalized.includes('l1e')) {
    return { brackets: [{ untilYears: 3, fromMonths: 36, intervalMonths: 24 }, { untilYears: Infinity, fromMonths: 36, intervalMonths: 24 }] };
  }
  if (normalized.includes('motocicleta') || normalized.includes('triciclo') || normalized.includes('quad')) {
    return { brackets: [{ untilYears: 4, fromMonths: 48, intervalMonths: 24 }, { untilYears: Infinity, fromMonths: 48, intervalMonths: 24 }] };
  }
  if (normalized.includes('taxi') || normalized.includes('vtc') || normalized.includes('ambulancia') || normalized.includes('transporte escolar')) {
    return { brackets: [{ untilYears: 5, fromMonths: 12, intervalMonths: 12 }, { untilYears: Infinity, fromMonths: 12, intervalMonths: 6 }] };
  }
  if (normalized.includes('autoescuela')) {
    return {
      brackets: [
        { untilYears: 2, fromMonths: 24, intervalMonths: 12 },
        { untilYears: 5, fromMonths: 24, intervalMonths: 12 },
        { untilYears: Infinity, fromMonths: 24, intervalMonths: 6 },
      ],
    };
  }
  if (normalized.includes('autobus') || normalized.includes('autocar') || normalized.includes('m2') || normalized.includes('m3')) {
    return { brackets: [{ untilYears: 5, fromMonths: 12, intervalMonths: 12 }, { untilYears: Infinity, fromMonths: 12, intervalMonths: 6 }] };
  }
  if (normalized.includes('n1') || normalized.includes('furgon') || normalized.includes('camion ligero')) {
    return {
      brackets: [
        { untilYears: 2, fromMonths: 24, intervalMonths: 24 },
        { untilYears: 6, fromMonths: 24, intervalMonths: 24 },
        { untilYears: 10, fromMonths: 24, intervalMonths: 12 },
        { untilYears: Infinity, fromMonths: 24, intervalMonths: 6 },
      ],
    };
  }
  if (normalized.includes('n2') || normalized.includes('n3') || normalized.includes('pesado') || normalized.includes('cabeza tractora')) {
    return { brackets: [{ untilYears: 10, fromMonths: 12, intervalMonths: 12 }, { untilYears: Infinity, fromMonths: 12, intervalMonths: 6 }] };
  }
  if (normalized.includes('o2') || normalized.includes('caravana') || normalized.includes('remolque pesado')) {
    return { brackets: [{ untilYears: 6, fromMonths: 72, intervalMonths: 24 }, { untilYears: Infinity, fromMonths: 72, intervalMonths: 24 }] };
  }
  if (normalized.includes('agricola rapido')) {
    return { brackets: [{ untilYears: 4, fromMonths: 48, intervalMonths: 24 }, { untilYears: 16, fromMonths: 48, intervalMonths: 24 }, { untilYears: Infinity, fromMonths: 48, intervalMonths: 12 }] };
  }
  if (normalized.includes('agricola lento')) {
    return { brackets: [{ untilYears: 8, fromMonths: 96, intervalMonths: 24 }, { untilYears: 16, fromMonths: 96, intervalMonths: 24 }, { untilYears: Infinity, fromMonths: 96, intervalMonths: 12 }] };
  }
  if (normalized.includes('especial')) {
    return { brackets: [{ untilYears: 4, fromMonths: 48, intervalMonths: 24 }, { untilYears: 10, fromMonths: 48, intervalMonths: 24 }, { untilYears: Infinity, fromMonths: 48, intervalMonths: 12 }] };
  }
  return {
    brackets: [
      { untilYears: 4, fromMonths: 48, intervalMonths: 24 },
      { untilYears: 10, fromMonths: 48, intervalMonths: 24 },
      { untilYears: Infinity, fromMonths: 48, intervalMonths: 12 },
    ],
  };
}

function latestItvRecord(records) {
  return [...records].sort((a, b) => String(b.next_date).localeCompare(String(a.next_date)))[0];
}

function addMonths(date, months) {
  const [year, month, day] = String(date).split('-').map(Number);
  if (!year || !month || !day) return today();
  const target = new Date(year, month - 1 + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return toDateInputValue(target);
}

function yearsBetween(startDate, endDate) {
  const start = parseInputDate(startDate);
  const end = parseInputDate(endDate);
  if (!start || !end || end < start) return 0;
  let years = end.getFullYear() - start.getFullYear();
  const anniversary = new Date(end.getFullYear(), start.getMonth(), start.getDate());
  if (end < anniversary) years -= 1;
  return years;
}

function daysBetween(startDate, endDate) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const start = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  return Math.round((end - start) / millisecondsPerDay);
}

function normalizeType(type) {
  return String(type)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizeItvCategories(categories) {
  return categories
    .map((category) => ({
      value: cleanCategoryValue(category.value || category.label),
      label: cleanTextValue(category.label || category.value),
      firstMonths: toIntegerValue(category.firstMonths, 0),
      intervals: cleanTextValue(category.intervals),
      exempt: Boolean(category.exempt),
      exemptFromYears: toOptionalNumber(category.exemptFromYears),
    }))
    .filter((category) => category.value && category.label);
}

function cleanCategoryValue(value) {
  return cleanTextValue(value).replace(/\s+/g, ' ');
}

function slugifyCategory(value) {
  const slug = normalizeType(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug ? `categoria-${slug}` : `categoria-${Date.now()}`;
}

function cleanTextValue(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function parseIntervalText(intervals, firstMonths) {
  const parsed = cleanTextValue(intervals)
    .split(',')
    .map((item) => {
      const [fromYears, intervalMonths] = item.split(':').map((part) => Number.parseInt(part.trim(), 10));
      if (!Number.isFinite(fromYears) || !Number.isFinite(intervalMonths) || fromYears < 0 || intervalMonths < 0) return null;
      return { fromYears, intervalMonths };
    })
    .filter(Boolean)
    .sort((a, b) => a.fromYears - b.fromYears);

  if (parsed.length === 0) {
    return [{ untilYears: Infinity, fromMonths: toIntegerValue(firstMonths, 12), intervalMonths: toIntegerValue(firstMonths, 12) }];
  }

  const brackets = [];
  const firstFromYears = parsed[0].fromYears;
  if (firstFromYears > 0) {
    brackets.push({
      untilYears: firstFromYears,
      fromMonths: toIntegerValue(firstMonths, firstFromYears * 12),
      intervalMonths: toIntegerValue(firstMonths, firstFromYears * 12),
    });
  }

  parsed.forEach((item, index) => {
    brackets.push({
      untilYears: parsed[index + 1]?.fromYears ?? Infinity,
      fromMonths: toIntegerValue(firstMonths, item.fromYears * 12),
      intervalMonths: item.intervalMonths,
    });
  });

  return brackets;
}

function intervalTextToRows(intervals) {
  return cleanTextValue(intervals)
    .split(',')
    .map((item) => {
      const [fromYears, intervalMonths] = item.split(':').map((part) => Number.parseInt(part.trim(), 10));
      if (!Number.isFinite(fromYears) || !Number.isFinite(intervalMonths)) return null;
      return { fromYears, intervalMonths };
    })
    .filter(Boolean)
    .sort((a, b) => a.fromYears - b.fromYears);
}

function intervalRowsToText(rows) {
  return rows
    .map((row) => ({
      fromYears: toIntegerValue(row.fromYears, 0),
      intervalMonths: toIntegerValue(row.intervalMonths, 0),
    }))
    .filter((row) => row.intervalMonths > 0)
    .sort((a, b) => a.fromYears - b.fromYears)
    .map((row) => `${row.fromYears}:${row.intervalMonths}`)
    .join(',');
}

function toIntegerValue(value, fallback = 0) {
  const number = Number.parseInt(value ?? fallback, 10);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function toDecimalValue(value, fallback = 0) {
  const number = Number.parseFloat(String(value ?? fallback).replace(',', '.'));
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function toOptionalNumber(value) {
  if (value === '' || value === undefined || value === null) return '';
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number >= 0 ? number : '';
}

function parseInputDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) return null;
  return new Date(`${date}T00:00:00`);
}

function toDateInputValue(date) {
  const offset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function formatDate(date) {
  if (!parseInputDate(date)) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-ES').format(new Date(`${date}T00:00:00`));
}

function formatItvDate(date) {
  return date ? formatDate(date) : 'Exento';
}

function isItvExpired(date) {
  const parsed = parseInputDate(date);
  if (!parsed) return false;
  return parsed < parseInputDate(today());
}

createRoot(document.getElementById('root')).render(<App />);
