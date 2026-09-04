import React, { useEffect, useState, useCallback, useRef } from "react";
import { Plus, X, Folder, Trash2, Edit2, Search, ChevronDown, ChevronUp } from "lucide-react";
import TopBar from "../components/TopBar.jsx";
import Sidebar from "../components/Sidebar.jsx";
import Toast from "../components/Toast.jsx";
import { useToast } from "../hooks/useToast.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const VEHICLE_ORDER_GROUPS = [
  ["scooter"],
  ["bike", "bicycle", "2-wheeler"],
  ["car", "cars"],
  ["3-wheeler", "three", "three-wheeler", "three wheeler"],
  ["pickup", "van"],
  ["tractor", "tractors"],
  ["bus"],
  ["truck"],
];

const SERVICE_ORDER_GROUPS = [
  ["General service", "General Services", "General Service", "General Servicing"],
  ["Engine oil"],
  ["Tyre & Wheel care"],
  ["Batteries"],
  ["Brake & Suspension"],
  ["Lights & Mirror"],
  ["Switches & Buttons"],
  ["Denting & Painting"],
  ["Clutch & Transmission"],
];

const getOrderIndex = (name = "") => {
  const n = name.toLowerCase();
  for (let i = 0; i < VEHICLE_ORDER_GROUPS.length; i++) {
    for (const kw of VEHICLE_ORDER_GROUPS[i]) {
      if (n.includes(kw)) return i;
    }
  }
  return VEHICLE_ORDER_GROUPS.length;
};

const sortVehicles = (vehicles) =>
  [...vehicles].sort((a, b) => getOrderIndex(a.name) - getOrderIndex(b.name));

const getServiceOrderIndex = (name = "") => {
  const n = name.toLowerCase();
  for (let i = 0; i < SERVICE_ORDER_GROUPS.length; i++) {
    for (const kw of SERVICE_ORDER_GROUPS[i]) {
      if (n.includes(kw.toLowerCase())) return i;
    }
  }
  return SERVICE_ORDER_GROUPS.length;
};

const sortServices = (services) =>
  [...services].sort((a, b) => getServiceOrderIndex(a.name) - getServiceOrderIndex(b.name));

const sortBrands = (brands) =>
  [...brands].sort((a, b) => (a.name || "").localeCompare(b.name || ""));

const sortServiceTypes = (types) =>
  [...types].sort((a, b) => (a.price || 0) - (b.price || 0));

const CategoryCardSkeleton = () => (
  <div className="bg-white rounded-xl border shadow-sm overflow-hidden animate-pulse">
    <div className="p-4 flex items-center justify-between">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-12 h-12 bg-gray-200 rounded-lg" />
        <div className="space-y-2 flex-1">
          <div className="h-5 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-100 rounded w-20" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="w-8 h-8 bg-gray-100 rounded-lg" />
        <div className="w-8 h-8 bg-gray-100 rounded-lg" />
      </div>
    </div>
  </div>
);

const ServiceListSkeleton = () => (
  <div className="p-4 border-t bg-gray-50/50 space-y-4 animate-pulse">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="border rounded-lg p-4 bg-white">
        <div className="flex items-center gap-3 mb-3 border-b pb-2">
          <div className="w-8 h-8 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded flex-1 max-w-[200px]" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(2)].map((_, j) => (
            <div key={j} className="bg-gray-50 p-3 rounded border flex gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

const ListItemSkeleton = () => (
  <div className="flex items-center justify-between border p-2 rounded-lg animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-1/3" />
    <div className="flex gap-2">
      <div className="w-8 h-8 bg-gray-100 rounded" />
      <div className="w-8 h-8 bg-gray-100 rounded" />
    </div>
  </div>
);

const CreateService = () => {
  // Helper component to show truncated text with Show more / Show less
  const TypeText = ({ text, className }) => {
    const [expanded, setExpanded] = useState(false);
    const [maxChars, setMaxChars] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 640 ? 150 : 300));

    useEffect(() => {
      const onResize = () => setMaxChars(window.innerWidth < 640 ? 150 : 300);
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }, []);

    if (!text) return null;

    const needsTruncate = text.length > maxChars;
    return (
      <>
        <p className={className}>{expanded || !needsTruncate ? text : `${text.slice(0, maxChars)}...`}</p>
        {needsTruncate && (
          <button type="button" onClick={() => setExpanded(!expanded)} className="text-md font-bold text-red-600 underline ml-1">
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </>
    );
  };
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [activeTab, setActiveTab] = useState("vehicle");
  const [showModal, setShowModal] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadingVehicleIds, setLoadingVehicleIds] = useState(() => new Set());
  const [error, setError] = useState(null);
  const fetchingVehicleIds = useRef(new Set());
  const loadedVehicleIdsRef = useRef(new Set());
  const { toasts, addToast } = useToast();

  // Dropdown state: card ID track karne ke liye
  const [expandedId, setExpandedId] = useState(null);

  // Form states
  const [modalMode, setModalMode] = useState("service");
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [editingServiceCategoryId, setEditingServiceCategoryId] = useState(null);
  const [editingTypeId, setEditingTypeId] = useState(null);
  const [editingTypeServiceId, setEditingTypeServiceId] = useState(null);
  const [editingTypeCategoryId, setEditingTypeCategoryId] = useState(null);
  const [editingEquipmentId, setEditingEquipmentId] = useState(null);
  const [categoryName, setCategoryName] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [itemName, setItemName] = useState("");
  const [subdescription, setSubdescription] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemDiscountPrice, setItemDiscountPrice] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState(null);
  const [categories, setCategories] = useState({ vehicle: [], equipment: [] });
  // Brand states
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [brandsList, setBrandsList] = useState([]);
  const [brandsVehicleId, setBrandsVehicleId] = useState(null);
  const [brandName, setBrandName] = useState("");
  const [editingBrandIdLocal, setEditingBrandIdLocal] = useState(null);
  const [brandLoading, setBrandLoading] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState(null);
  const [modelsList, setModelsList] = useState([]);
  const [vehicleBrands, setVehicleBrands] = useState({});
  const [selectedBrandByService, setSelectedBrandByService] = useState({});
  const [selectedModelByService, setSelectedModelByService] = useState({});
  const [filteredTypesByService, setFilteredTypesByService] = useState({});
  const [loadingFilteredTypesByService, setLoadingFilteredTypesByService] = useState({});
  // For service-type creation: multiple brand/model selection
  const [selectedBrandIds, setSelectedBrandIds] = useState([]);
  const [modelsByBrand, setModelsByBrand] = useState({});
  const [selectedModelIdsByBrand, setSelectedModelIdsByBrand] = useState({});
  const [modelName, setModelName] = useState("");
  const [editingModelId, setEditingModelId] = useState(null);
  const [modelLoading, setModelLoading] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState(null);
  const [fuelsList, setFuelsList] = useState([]);
  const [fuelName, setFuelName] = useState("");
  const [editingFuelId, setEditingFuelId] = useState(null);
  const [fuelLoading, setFuelLoading] = useState(false);
  const [engineCCList, setEngineCCList] = useState([]);
  const [engineCCName, setEngineCCName] = useState("");
  const [editingEngineCCId, setEditingEngineCCId] = useState(null);
  const [engineCCLoading, setEngineCCLoading] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // Card click handler
  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const setVehicleLoading = useCallback((vehicleId, isLoading) => {
    setLoadingVehicleIds((prev) => {
      const next = new Set(prev);
      if (isLoading) next.add(vehicleId);
      else next.delete(vehicleId);
      return next;
    });
  }, []);

  const fetchVehicleDetails = useCallback(async (vehicleId, force = false) => {
    if (!vehicleId || fetchingVehicleIds.current.has(vehicleId)) return;
    if (!force && loadedVehicleIdsRef.current.has(vehicleId)) return;

    fetchingVehicleIds.current.add(vehicleId);
    setVehicleLoading(vehicleId, true);

    try {
      const sRes = await fetch(`${API_BASE_URL}/api/client/vehicle/${vehicleId}/services`);
      if (sRes.status === 429) throw new Error("Rate limit exceeded. Please wait.");
      const services = await sRes.json();

      // For each service, fetch types per brand+model using admin endpoints
      // Step 1: get brands for this vehicle (normalize response shape)
      let brands = [];
      try {
        const bRes = await fetch(`${API_BASE_URL}/api/admin/vehicle/${vehicleId}/brand`);
        if (bRes.ok) {
          const jb = await bRes.json();
          brands = Array.isArray(jb) ? jb : jb?.data || [];
        }
      } catch (err) {
        brands = [];
      }
      // persist brands for this vehicle so UI filters can use them
      setVehicleBrands((prev) => ({ ...prev, [vehicleId]: sortBrands(brands) }));

      const servicesWithTypes = await Promise.all(
        (Array.isArray(services) ? services : []).map(async (s) => {
          const aggregatedTypes = [];
          const typeMap = new Map(); // Map to deduplicate by type ID

          for (const brand of Array.isArray(brands) ? brands : []) {
            let models = [];
            try {
              const mRes = await fetch(`${API_BASE_URL}/api/admin/vehicle/${vehicleId}/brand/${brand.id}/model`);
              if (mRes.ok) {
                const jm = await mRes.json();
                models = Array.isArray(jm) ? jm : jm?.data || [];
              }
            } catch (err) {
              models = [];
            }

            for (const model of models) {
              try {
                const tRes = await fetch(
                  `${API_BASE_URL}/api/admin/vehicle/${vehicleId}/brand/${brand.id}/model/${model.id}/service/${s.id}/types`
                );
                if (!tRes.ok) continue;
                const j = await tRes.json();
                const list = (j && (Array.isArray(j.data) ? j.data : Array.isArray(j) ? j : []));
                for (const t of list) {
                  if (!typeMap.has(t.id)) {
                    typeMap.set(t.id, { ...t, _brandId: brand.id, _modelId: model.id, _brandName: brand.name, _modelName: model.name });
                  }
                }
              } catch (err) {
                // ignore per-model errors
              }
            }
          }
          aggregatedTypes.push(...typeMap.values());
          return { ...s, types: sortServiceTypes(aggregatedTypes) };
        })
      );

      loadedVehicleIdsRef.current.add(vehicleId);
      setCategories((prev) => ({
        ...prev,
        vehicle: prev.vehicle.map((v) =>
          v.id === vehicleId
            ? { ...v, items: sortServices(servicesWithTypes), detailsLoaded: true }
            : v
        ),
      }));
    } catch (err) {
      addToast(err.message || "Failed to load services", "error");
    } finally {
      fetchingVehicleIds.current.delete(vehicleId);
      setVehicleLoading(vehicleId, false);
    }
  }, [addToast, setVehicleLoading]);

  const fetchVehicles = useCallback(async () => {
    setInitialLoading(true);
    setError(null);
    loadedVehicleIdsRef.current = new Set();
    try {
      const vRes = await fetch(`${API_BASE_URL}/api/client/vehicles`);
      if (vRes.status === 429) throw new Error("Rate limit exceeded. Please wait.");
      const vehicles = await vRes.json();

      const vehicleData = sortVehicles(
        (Array.isArray(vehicles) ? vehicles : []).map((v) => ({
          id: v.id,
          name: v.name,
          icon: v.iconUrl || v.icon || v.icon_url || "",
          items: [],
          detailsLoaded: false,
        }))
      );

      setCategories((prev) => ({ ...prev, vehicle: vehicleData }));
    } catch (err) {
      setError(err.message);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  const fetchEquipment = useCallback(async () => {
    setInitialLoading(true);
    setError(null);
    try {
      const eRes = await fetch(`${API_BASE_URL}/api/client/equipments`);
      const eData = await eRes.json();
      const equipments = Array.isArray(eData) ? eData : eData.data || [];

      setCategories((prev) => ({
        ...prev,
        equipment: [{
          id: "all-equip",
          name: "General Equipment",
          items: sortServices(equipments.map((e) => ({
            id: e.id,
            name: e.name,
            icon: e.iconUrl,
            types: [],
          }))),
        }],
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  const refreshCurrentTab = useCallback(async (vehicleId = null) => {
    if (activeTab === "vehicle") {
      await fetchVehicles();
      if (vehicleId) {
        loadedVehicleIdsRef.current.delete(vehicleId);
        await fetchVehicleDetails(vehicleId, true);
      }
    } else {
      await fetchEquipment();
    }
  }, [activeTab, fetchVehicles, fetchEquipment, fetchVehicleDetails]);

  useEffect(() => {
    setExpandedId(null);
    if (activeTab === "vehicle") fetchVehicles();
    else fetchEquipment();
  }, [activeTab, fetchVehicles, fetchEquipment]);

  useEffect(() => {
    if (activeTab === "vehicle" && expandedId) {
      fetchVehicleDetails(expandedId);
    }
  }, [activeTab, expandedId, fetchVehicleDetails]);

  // When opening the create type modal and a vehicle is selected, load brands for that vehicle
  useEffect(() => {
    if (modalMode === "type" && selectedCategoryId) {
      fetchBrands(selectedCategoryId);
      setSelectedBrandIds([]);
      setModelsByBrand({});
      setSelectedModelIdsByBrand({});
    }
  }, [modalMode, selectedCategoryId]);

  // Brands API helpers
  const fetchBrands = async (vehicleId) => {
    if (!vehicleId) return;
    setBrandLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/vehicle/${vehicleId}/brand`);
      if (!res.ok) throw new Error("Failed to fetch brands");
      const data = await res.json();
      setBrandsList(sortBrands(Array.isArray(data) ? data : []));
    } catch (err) {
      addToast(err.message || "Failed to load brands", "error");
      setBrandsList([]);
    } finally {
      setBrandLoading(false);
    }
  };

  const openBrandsModal = (vehicleId) => {
    setBrandsVehicleId(vehicleId);
    setBrandName("");
    setEditingBrandIdLocal(null);
    setSelectedBrandId(null);
    setModelsList([]);
    setModelName("");
    setEditingModelId(null);
    fetchBrands(vehicleId);
    setShowBrandModal(true);
  };

  const resetBrandModal = () => {
    setBrandsVehicleId(null);
    setBrandsList([]);
    setBrandName("");
    setEditingBrandIdLocal(null);
    setSelectedBrandId(null);
    setModelsList([]);
    setModelName("");
    setEditingModelId(null);
    setSelectedModelId(null);
    setFuelsList([]);
    setFuelName("");
    setEditingFuelId(null);
    setEngineCCList([]);
    setEngineCCName("");
    setEditingEngineCCId(null);
    setShowBrandModal(false);
  };
  const selectAllModels = (brandId) => {
    const models = modelsByBrand[brandId] || [];

    setSelectedModelIdsByBrand((prev) => ({
      ...prev,
      [brandId]: new Set(models.map((m) => m.id)),
    }));
  };

  const clearAllModels = (brandId) => {
    setSelectedModelIdsByBrand((prev) => ({
      ...prev,
      [brandId]: new Set(),
    }));
  };

  const handleCreateBrand = async () => {
    if (!brandName?.trim()) return addToast("Brand name is required", "warning");
    if (!brandsVehicleId) return addToast("Vehicle not selected", "warning");
    try {
      setBrandLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/admin/vehicle/${brandsVehicleId}/brand`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: brandName.trim() })
      });
      if (!res.ok) throw new Error("Failed to create brand");
      const data = await res.json().catch(() => ({}));
      addToast(data.message || "Brand created", "success");
      setBrandName("");
      fetchBrands(brandsVehicleId);
    } catch (err) {
      addToast(err.message || "Create brand failed", "error");
    } finally {
      setBrandLoading(false);
    }
  };

  const handleUpdateBrand = async () => {
    if (!brandName?.trim()) return addToast("Brand name is required", "warning");
    if (!brandsVehicleId || !editingBrandIdLocal) return addToast("Missing info", "warning");
    try {
      setBrandLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/admin/vehicle/${brandsVehicleId}/brand/${editingBrandIdLocal}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: brandName.trim() })
      });
      if (!res.ok) throw new Error("Failed to update brand");
      const data = await res.json().catch(() => ({}));
      addToast(data.message || "Brand updated", "success");
      setBrandName("");
      setEditingBrandIdLocal(null);
      fetchBrands(brandsVehicleId);
    } catch (err) {
      addToast(err.message || "Update brand failed", "error");
    } finally {
      setBrandLoading(false);
    }
  };

  const fetchModels = async (vehicleId, brandId) => {
    if (!vehicleId || !brandId) return;
    setModelLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/vehicle/${vehicleId}/brand/${brandId}/model`);
      if (!res.ok) throw new Error("Failed to fetch models");
      const data = await res.json();
      setModelsList(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      addToast(err.message || "Failed to load models", "error");
      setModelsList([]);
    } finally {
      setModelLoading(false);
    }
  };

  const selectBrandModels = (brandId) => {
    setSelectedBrandId(brandId);
    setSelectedModelId(null);
    setEditingModelId(null);
    setModelName("");
    setFuelsList([]);
    setFuelName("");
    setEditingFuelId(null);
    fetchModels(brandsVehicleId, brandId);
  };

  // Fetch models for a given vehicleId+brandId (used in type creation modal)
  const fetchModelsForType = async (vehicleId, brandId) => {
    if (!vehicleId || !brandId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/vehicle/${vehicleId}/brand/${brandId}/model`);
      if (!res.ok) throw new Error("Failed to fetch models");
      const data = await res.json();
      const models = Array.isArray(data) ? data : data.data || [];
      setModelsByBrand((prev) => ({ ...prev, [brandId]: models }));
      setSelectedModelIdsByBrand((prev) => ({ ...prev, [brandId]: prev[brandId] ? new Set(prev[brandId]) : new Set() }));
    } catch (err) {
      addToast(err.message || "Failed to load models", "error");
      setModelsByBrand((prev) => ({ ...prev, [brandId]: [] }));
    }
  };

  const toggleBrandSelection = (brandId) => {
    setSelectedBrandIds((prev) => {
      const next = new Set(prev);
      if (next.has(brandId)) {
        next.delete(brandId);
        // also clear models selection for this brand
        setSelectedModelIdsByBrand((s) => {
          const copy = { ...s };
          delete copy[brandId];
          return copy;
        });
      } else {
        next.add(brandId);
        fetchModelsForType(selectedCategoryId, brandId);
      }
      return Array.from(next);
    });
  };

  const toggleModelSelection = (brandId, modelId) => {
    setSelectedModelIdsByBrand((prev) => {
      const copy = { ...prev };
      const setForBrand = copy[brandId] ? new Set(copy[brandId]) : new Set();
      if (setForBrand.has(modelId)) setForBrand.delete(modelId);
      else setForBrand.add(modelId);
      copy[brandId] = setForBrand;
      return copy;
    });
  };

  const handleFilterBrandChange = (serviceId, vehicleId, brandId) => {
    setSelectedBrandByService((prev) => ({ ...prev, [serviceId]: brandId }));
    setSelectedModelByService((prev) => ({ ...prev, [serviceId]: null }));
    // fetch models for this brand
    if (brandId) fetchModelsForType(vehicleId, brandId);
    // clear any previous filtered types for this service
    setFilteredTypesByService((prev) => ({ ...prev, [serviceId]: null }));
  };

  const handleFilterModelChange = async (serviceId, vehicleId, brandId, modelId) => {
    setSelectedModelByService((prev) => ({ ...prev, [serviceId]: modelId }));
    if (!brandId || !modelId) {
      setFilteredTypesByService((prev) => ({ ...prev, [serviceId]: null }));
      return;
    }
    setLoadingFilteredTypesByService((prev) => ({ ...prev, [serviceId]: true }));
    const types = await fetchServiceTypesForMapping(vehicleId, brandId, modelId, serviceId);
    setFilteredTypesByService((prev) => ({ ...prev, [serviceId]: sortServiceTypes(types) }));
    setLoadingFilteredTypesByService((prev) => ({ ...prev, [serviceId]: false }));
  };

  // Helper: fetch service types for a specific vehicle-brand-model-service tuple (admin API)
  const fetchServiceTypesForMapping = async (vehicleId, brandId, modelId, serviceId) => {
    if (!vehicleId || !brandId || !modelId || !serviceId) return [];
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/vehicle/${vehicleId}/brand/${brandId}/model/${modelId}/service/${serviceId}/types`);
      if (!res.ok) throw new Error("Failed to fetch service types");
      const data = await res.json();
      return Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
    } catch (err) {
      addToast(err.message || "Failed to load service types", "error");
      return [];
    }
  };

  const fetchFuels = async (vehicleId, brandId, modelId) => {
    if (!vehicleId || !brandId || !modelId) return;
    setFuelLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/vehicle/${vehicleId}/brand/${brandId}/model/${modelId}/fuel`);
      if (!res.ok) throw new Error("Failed to fetch fuels");
      const data = await res.json();
      setFuelsList(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      addToast(err.message || "Failed to load fuels", "error");
      setFuelsList([]);
    } finally {
      setFuelLoading(false);
    }
  };

  const selectModelFuels = (modelId) => {
    setSelectedModelId(modelId);
    setEditingFuelId(null);
    setFuelName("");
    fetchFuels(brandsVehicleId, selectedBrandId, modelId);
    selectModelEngineCC(modelId);
  };

  const handleCreateModel = async () => {
    if (!modelName?.trim()) return addToast("Model name is required", "warning");
    if (!brandsVehicleId || !selectedBrandId) return addToast("Select a brand first", "warning");
    try {
      setModelLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/admin/vehicle/${brandsVehicleId}/brand/${selectedBrandId}/model`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: modelName.trim() })
      });
      if (!res.ok) throw new Error("Failed to create model");
      const data = await res.json().catch(() => ({}));
      addToast(data.message || "Model created", "success");
      setModelName("");
      fetchModels(brandsVehicleId, selectedBrandId);
    } catch (err) {
      addToast(err.message || "Create model failed", "error");
    } finally {
      setModelLoading(false);
    }
  };

  const handleUpdateModel = async () => {
    if (!modelName?.trim()) return addToast("Model name is required", "warning");
    if (!brandsVehicleId || !selectedBrandId || !editingModelId) return addToast("Missing model information", "warning");
    try {
      setModelLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/admin/vehicle/${brandsVehicleId}/brand/${selectedBrandId}/model/${editingModelId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: modelName.trim() })
      });
      if (!res.ok) throw new Error("Failed to update model");
      const data = await res.json().catch(() => ({}));
      addToast(data.message || "Model updated", "success");
      setModelName("");
      setEditingModelId(null);
      fetchModels(brandsVehicleId, selectedBrandId);
    } catch (err) {
      addToast(err.message || "Update model failed", "error");
    } finally {
      setModelLoading(false);
    }
  };

  const handleDeleteModel = async (modelId) => {
    if (!brandsVehicleId || !selectedBrandId || !modelId) return;
    if (!window.confirm("Delete this model?")) return;
    try {
      setModelLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/admin/vehicle/${brandsVehicleId}/brand/${selectedBrandId}/model/${modelId}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete model");
      const data = await res.json().catch(() => ({}));
      addToast(data.message || "Model deleted", "success");
      if (selectedModelId === modelId) {
        setSelectedModelId(null);
        setFuelsList([]);
        setFuelName("");
        setEditingFuelId(null);
      }
      fetchModels(brandsVehicleId, selectedBrandId);
    } catch (err) {
      addToast(err.message || "Delete model failed", "error");
    } finally {
      setModelLoading(false);
    }
  };

  const handleCreateFuel = async () => {
    if (!fuelName?.trim()) return addToast("Fuel name is required", "warning");
    if (!brandsVehicleId || !selectedBrandId || !selectedModelId) return addToast("Select a model first", "warning");
    try {
      setFuelLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/admin/vehicle/${brandsVehicleId}/brand/${selectedBrandId}/model/${selectedModelId}/fuel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fuelName.trim() })
      });
      if (!res.ok) throw new Error("Failed to create fuel");
      const data = await res.json().catch(() => ({}));
      addToast(data.message || "Fuel created", "success");
      setFuelName("");
      fetchFuels(brandsVehicleId, selectedBrandId, selectedModelId);
    } catch (err) {
      addToast(err.message || "Create fuel failed", "error");
    } finally {
      setFuelLoading(false);
    }
  };

  const handleUpdateFuel = async () => {
    if (!fuelName?.trim()) return addToast("Fuel name is required", "warning");
    if (!brandsVehicleId || !selectedBrandId || !selectedModelId || !editingFuelId) return addToast("Missing fuel information", "warning");
    try {
      setFuelLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/admin/vehicle/${brandsVehicleId}/brand/${selectedBrandId}/model/${selectedModelId}/fuel/${editingFuelId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fuelName.trim() })
      });
      if (!res.ok) throw new Error("Failed to update fuel");
      const data = await res.json().catch(() => ({}));
      addToast(data.message || "Fuel updated", "success");
      setFuelName("");
      setEditingFuelId(null);
      fetchFuels(brandsVehicleId, selectedBrandId, selectedModelId);
    } catch (err) {
      addToast(err.message || "Update fuel failed", "error");
    } finally {
      setFuelLoading(false);
    }
  };

  const handleDeleteFuel = async (fuelId) => {
    if (!brandsVehicleId || !selectedBrandId || !selectedModelId || !fuelId) return;
    if (!window.confirm("Delete this fuel?")) return;
    try {
      setFuelLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/admin/vehicle/${brandsVehicleId}/brand/${selectedBrandId}/model/${selectedModelId}/fuel/${fuelId}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete fuel");
      const data = await res.json().catch(() => ({}));
      addToast(data.message || "Fuel deleted", "success");
      fetchFuels(brandsVehicleId, selectedBrandId, selectedModelId);
    } catch (err) {
      addToast(err.message || "Delete fuel failed", "error");
    } finally {
      setFuelLoading(false);
    }
  };

  const fetchEngineCC = async (vehicleId, brandId, modelId) => {
    if (!vehicleId || !brandId || !modelId) return;
    setEngineCCLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/vehicle/${vehicleId}/brand/${brandId}/model/${modelId}/engine-cc`);
      if (!res.ok) throw new Error("Failed to fetch engine CCs");
      const data = await res.json();
      setEngineCCList(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      addToast(err.message || "Failed to load engine CCs", "error");
      setEngineCCList([]);
    } finally {
      setEngineCCLoading(false);
    }
  };

  const selectModelEngineCC = (modelId) => {
    setEditingEngineCCId(null);
    setEngineCCName("");
    fetchEngineCC(brandsVehicleId, selectedBrandId, modelId);
  };

  const handleCreateEngineCC = async () => {
    if (!engineCCName?.trim()) return addToast("Engine CC name is required", "warning");
    if (!brandsVehicleId || !selectedBrandId || !selectedModelId) return addToast("Select a model first", "warning");
    try {
      setEngineCCLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/admin/vehicle/${brandsVehicleId}/brand/${selectedBrandId}/model/${selectedModelId}/engine-cc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: engineCCName.trim() })
      });
      if (!res.ok) throw new Error("Failed to create engine CC");
      const data = await res.json().catch(() => ({}));
      addToast(data.message || "Engine CC created", "success");
      setEngineCCName("");
      fetchEngineCC(brandsVehicleId, selectedBrandId, selectedModelId);
    } catch (err) {
      addToast(err.message || "Create engine CC failed", "error");
    } finally {
      setEngineCCLoading(false);
    }
  };

  const handleUpdateEngineCC = async () => {
    if (!engineCCName?.trim()) return addToast("Engine CC name is required", "warning");
    if (!brandsVehicleId || !selectedBrandId || !selectedModelId || !editingEngineCCId) return addToast("Missing engine CC information", "warning");
    try {
      setEngineCCLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/admin/vehicle/${brandsVehicleId}/brand/${selectedBrandId}/model/${selectedModelId}/engine-cc/${editingEngineCCId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: engineCCName.trim() })
      });
      if (!res.ok) throw new Error("Failed to update engine CC");
      const data = await res.json().catch(() => ({}));
      addToast(data.message || "Engine CC updated", "success");
      setEngineCCName("");
      setEditingEngineCCId(null);
      fetchEngineCC(brandsVehicleId, selectedBrandId, selectedModelId);
    } catch (err) {
      addToast(err.message || "Update engine CC failed", "error");
    } finally {
      setEngineCCLoading(false);
    }
  };

  const handleDeleteEngineCC = async (engineCCId) => {
    if (!brandsVehicleId || !selectedBrandId || !selectedModelId || !engineCCId) return;
    if (!window.confirm("Delete this engine CC?")) return;
    try {
      setEngineCCLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/admin/vehicle/${brandsVehicleId}/brand/${selectedBrandId}/model/${selectedModelId}/engine-cc/${engineCCId}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete engine CC");
      const data = await res.json().catch(() => ({}));
      addToast(data.message || "Engine CC deleted", "success");
      fetchEngineCC(brandsVehicleId, selectedBrandId, selectedModelId);
    } catch (err) {
      addToast(err.message || "Delete engine CC failed", "error");
    } finally {
      setEngineCCLoading(false);
    }
  };

  const handleDeleteBrand = async (brandId) => {
    if (!brandsVehicleId || !brandId) return;
    if (!window.confirm("Delete this brand?")) return;
    try {
      setBrandLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/admin/vehicle/${brandsVehicleId}/brand/${brandId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete brand");
      const data = await res.json().catch(() => ({}));
      addToast(data.message || "Brand deleted", "success");
      fetchBrands(brandsVehicleId);
      if (selectedBrandId === brandId) {
        setSelectedBrandId(null);
        setSelectedModelId(null);
        setModelsList([]);
        setModelName("");
        setEditingModelId(null);
        setFuelsList([]);
        setFuelName("");
        setEditingFuelId(null);
      }
    } catch (err) {
      addToast(err.message || "Delete brand failed", "error");
    } finally {
      setBrandLoading(false);
    }
  };

  const handleCreate = async () => {
    if (modalMode === "vehicle" || modalMode === "editVehicle") {
      if (!categoryName?.trim()) return addToast("Vehicle name is required", "warning");
      if (modalMode === "vehicle" && !iconFile) return addToast("Vehicle icon is required", "warning");
    } else if (modalMode === "editService") {
      if (!itemName?.trim()) return addToast("Name is required", "warning");
    } else if (modalMode === "editType") {
      if (!itemName?.trim()) return addToast("Name is required", "warning");
      if (!itemPrice) return addToast("Price is required", "warning");
    } else if (modalMode === "editEquipment") {
      if (!itemName?.trim()) return addToast("Name is required", "warning");
    } else if (!itemName?.trim()) {
      return addToast("Name is required", "warning");
    }
    if (modalMode === "service" && activeTab === "vehicle" && !selectedCategoryId) {
      return addToast("Please select a vehicle", "warning");
    }
    if ((modalMode === "service" || modalMode === "type") && !iconFile) {
      return addToast("Icon/Image is required", "warning");
    }
    try {
      setSubmitting(true);
      if (modalMode === "vehicle") {
        const vFormData = new FormData();
        vFormData.append("name", categoryName.trim());
        vFormData.append("icon", iconFile);

        const response = await fetch(`${API_BASE_URL}/api/admin/vehicle`, {
          method: "POST",
          body: vFormData,
        });

        if (!response.ok) throw new Error("Failed to create vehicle");

        setShowModal(false);
        resetModal();
        await refreshCurrentTab();
      } else if (modalMode === "editVehicle") {
        const updateData = new FormData();
        updateData.append("name", categoryName.trim());
        if (iconFile) updateData.append("icon", iconFile);

        const response = await fetch(`${API_BASE_URL}/api/admin/vehicle/${editingVehicleId}`, {
          method: "PUT",
          body: updateData,
        });

        if (!response.ok) throw new Error("Failed to update vehicle");

        setShowModal(false);
        resetModal();
        await refreshCurrentTab(editingVehicleId);
      } else if (modalMode === "editService") {
        const updateFormData = new FormData();
        updateFormData.append("name", itemName.trim());
        if (iconFile) updateFormData.append("icon", iconFile);

        const response = await fetch(
          `${API_BASE_URL}/api/admin/vehicle/${editingServiceCategoryId}/service/${editingServiceId}`,
          {
            method: "PUT",
            body: updateFormData,
          }
        );

        if (!response.ok) throw new Error("Failed to update service");

        setShowModal(false);
        resetModal();
        await refreshCurrentTab(editingServiceCategoryId);
      } else if (modalMode === "editType") {
        const updateTypeFormData = new FormData();
        updateTypeFormData.append("serviceId", selectedServiceId || editingTypeServiceId);
        updateTypeFormData.append("name", itemName.trim());
        updateTypeFormData.append("price", itemPrice);
        updateTypeFormData.append("discountPrice", itemDiscountPrice || 0);
        updateTypeFormData.append("estimatedTime", estimatedTime);
        updateTypeFormData.append("description", itemDesc);
        updateTypeFormData.append("subdescription", subdescription);
        const mappings = [];
        for (const brandId of selectedBrandIds || []) {
          const setForBrand = selectedModelIdsByBrand[brandId];
          if (setForBrand && setForBrand.size) {
            for (const m of setForBrand) {
              mappings.push({ vehicleId: selectedCategoryId || editingTypeCategoryId, brandId, modelId: m });
            }
          }
        }
        if (mappings.length > 0) {
          updateTypeFormData.append("vehicleMappings", JSON.stringify(mappings));
        }
        if (iconFile) updateTypeFormData.append("image", iconFile);

        const response = await fetch(`${API_BASE_URL}/api/admin/service-types/${editingTypeId}`, {
          method: "PUT",
          body: updateTypeFormData,
        });

        if (!response.ok) {
          const text = await response.text().catch(() => null);
          throw new Error(text || "Failed to update service type");
        }

        setShowModal(false);
        resetModal();
        await refreshCurrentTab(editingTypeCategoryId);
      } else if (modalMode === "editEquipment") {
        const updateEquipmentData = new FormData();
        updateEquipmentData.append("name", itemName.trim());
        if (iconFile) updateEquipmentData.append("icon", iconFile);

        const response = await fetch(
          `${API_BASE_URL}/api/admin/equipment/${editingEquipmentId}`,
          {
            method: "PUT",
            body: updateEquipmentData,
          }
        );

        if (!response.ok) throw new Error("Failed to update equipment");

        setShowModal(false);
        resetModal();
        await refreshCurrentTab();
      } else if (modalMode === "type") {
        if (!selectedCategoryId) return addToast("Please select a vehicle", "warning");
        if (!selectedServiceId) return addToast("Please select a service", "warning");
        if (!itemName?.trim()) return addToast("Name is required", "warning");
        if (!itemPrice) return addToast("Price is required", "warning");

        // build vehicleMappings from selected brands/models
        const mappings = [];
        for (const brandId of selectedBrandIds || []) {
          const setForBrand = selectedModelIdsByBrand[brandId];
          if (setForBrand && setForBrand.size) {
            for (const m of setForBrand) {
              mappings.push({ vehicleId: selectedCategoryId, brandId, modelId: m });
            }
          }
        }

        if (mappings.length === 0) return addToast("Select at least one model for selected brands", "warning");

        const formData = new FormData();
        formData.append("serviceId", selectedServiceId);
        formData.append("name", itemName.trim());
        formData.append("price", itemPrice);
        formData.append("discountPrice", itemDiscountPrice || 0);
        formData.append("description", itemDesc || "");
        formData.append("subdescription", subdescription || "");
        formData.append("estimatedTime", estimatedTime || "");
        formData.append("vehicleMappings", JSON.stringify(mappings));
        if (iconFile) formData.append("image", iconFile);

        const response = await fetch(`${API_BASE_URL}/api/admin/service-types`, {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const data = await response.json().catch(() => ({}));
          addToast(data.message || "Service type created", "success");
          setShowModal(false);
          resetModal();
          await refreshCurrentTab(selectedCategoryId);
        } else {
          const text = await response.text().catch(() => null);
          throw new Error(text || "Failed to create service type");
        }
      } else {
        const formData = new FormData();
        formData.append("name", itemName.trim());
        formData.append("icon", iconFile);

        const endpoint = activeTab === "vehicle"
          ? `${API_BASE_URL}/api/admin/vehicle/${selectedCategoryId}/service`
          : `${API_BASE_URL}/api/admin/equipment`;

        const response = await fetch(endpoint, { method: "POST", body: formData });
        if (response.ok) {
          setShowModal(false);
          resetModal();
          const refreshId = activeTab === "vehicle" ? selectedCategoryId : null;
          await refreshCurrentTab(refreshId);
        }
      }
    } catch (error) {
      addToast("Action failed.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const resetModal = () => {
    setEditingVehicleId(null);
    setEditingServiceId(null);
    setEditingServiceCategoryId(null);
    setEditingTypeId(null);
    setEditingTypeServiceId(null);
    setEditingTypeCategoryId(null);
    setEditingEquipmentId(null);
    setCategoryName("");
    setItemName("");
    setItemPrice("");
    setItemDiscountPrice("");
    setItemDesc("");
    setSubdescription("");
    setEstimatedTime("");
    setSelectedCategoryId("");
    setSelectedServiceId("");
    setIconFile(null);
    setIconPreview(null);
    setSelectedBrandIds([]);
    setSelectedModelIdsByBrand({});
    setModalMode("service");
  };

  const openEditVehicleModal = (vehicle) => {
    resetModal();
    setModalMode("editVehicle");
    setEditingVehicleId(vehicle.id);
    setCategoryName(vehicle.name || "");
    setIconPreview(vehicle.icon || vehicle.iconUrl || null);
    setShowModal(true);
  };

  const openEditServiceModal = (service, categoryId) => {
    resetModal();
    setModalMode("editService");
    setEditingServiceId(service.id);
    setEditingServiceCategoryId(categoryId);
    setItemName(service.name || "");
    setIconPreview(service.icon || service.iconUrl || service.icon_url || null);
    setShowModal(true);
  };

  const openEditTypeModal = async (type, serviceId, categoryId) => {
    try {
      resetModal();

      // Fetch complete service type details
      const res = await fetch(
        `${API_BASE_URL}/api/admin/service-types/${type.id}`
      );

      if (!res.ok) {
        throw new Error("Failed to fetch service type");
      }

      const json = await res.json();

      // Replace list data with full document
      type = json.data;

      setModalMode("editType");
      setEditingTypeId(type.id);
      setEditingTypeServiceId(serviceId);
      setEditingTypeCategoryId(categoryId);

      setSelectedCategoryId(categoryId);
      setSelectedServiceId(type.serviceId);

      setItemName(type.name || "");
      setItemPrice(type.price || "");
      setItemDiscountPrice(type.discountPrice || 0);
      setItemDesc(type.description || "");
      setSubdescription(type.subdescription || "");
      setEstimatedTime(type.estimatedTime || "");
      setIconPreview(type.imageUrl || null);

      // Vehicle Mappings
      const mappings = Array.isArray(type.vehicleMappings)
        ? type.vehicleMappings
        : [];

      const brandIds = [...new Set(mappings.map((m) => m.brandId))];

      setSelectedBrandIds(brandIds);

      const modelSelection = {};

      mappings.forEach((m) => {
        if (!modelSelection[m.brandId]) {
          modelSelection[m.brandId] = new Set();
        }

        modelSelection[m.brandId].add(m.modelId);
      });

      setSelectedModelIdsByBrand(modelSelection);

      // Load brands
      await fetchBrands(categoryId);

      // Load models of selected brands
      await Promise.all(
        brandIds.map((brandId) =>
          fetchModelsForType(categoryId, brandId)
        )
      );

      setShowModal(true);

    } catch (err) {
      addToast(err.message, "error");
    }
  };

  const openEditEquipmentModal = (equipment) => {
    resetModal();
    setModalMode("editEquipment");
    setEditingEquipmentId(equipment.id);
    setItemName(equipment.name || "");
    setIconPreview(equipment.icon || equipment.iconUrl || null);
    setShowModal(true);
  };

  const handleIconUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setIconFile(file);
      setIconPreview(URL.createObjectURL(file));
    }
  };

  // Delete handlers
  const handleDeleteVehicle = async (vehicleId) => {
    if (!window.confirm("Delete this vehicle and all its services?")) return;
    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE_URL}/api/admin/vehicle/${vehicleId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete vehicle");
      const data = await res.json().catch(() => ({}));
      addToast(data.message || "Vehicle deleted", "success");
      if (expandedId === vehicleId) setExpandedId(null);
      await refreshCurrentTab();
    } catch (err) {
      addToast("Delete failed.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteService = async (vehicleId, serviceId) => {
    if (!window.confirm("Delete this service?")) return;
    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE_URL}/api/admin/vehicle/${vehicleId}/service/${serviceId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete service");
      const data = await res.json().catch(() => ({}));
      addToast(data.message || "Service deleted", "success");
      await refreshCurrentTab(vehicleId);
    } catch (err) {
      addToast("Delete failed.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteType = async (vehicleId, serviceId, typeId) => {
    if (!window.confirm("Delete this service type?")) return;
    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE_URL}/api/admin/service-types/${typeId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete service type");
      const data = await res.json().catch(() => ({}));
      addToast(data.message || "Service type deleted", "success");
      await refreshCurrentTab(vehicleId);
    } catch (err) {
      addToast("Delete failed.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEquipment = async (equipmentId) => {
    if (!window.confirm("Delete this equipment?")) return;
    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE_URL}/api/admin/equipment/${equipmentId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete equipment");
      const data = await res.json().catch(() => ({}));
      addToast(data.message || "Equipment deleted", "success");
      await refreshCurrentTab();
    } catch (err) {
      addToast("Delete failed.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVehicleSelect = (vehicleId) => {
    setSelectedCategoryId(vehicleId);
    if (vehicleId) fetchVehicleDetails(vehicleId);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Toast toasts={toasts} />
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      <div className={`flex-1 flex flex-col transition-all ${sidebarOpen ? "lg:ml-60" : "ml-0"}`}>
        <TopBar toggleSidebar={toggleSidebar} />

        <main className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Service Management</h2>
            <div className="flex gap-2">
              {activeTab === "vehicle" && (
                <button
                  onClick={() => { resetModal(); setModalMode("vehicle"); setShowModal(true); }}
                  className="bg-[#DC2626] text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  New Vehicle
                </button>
              )}
              <button onClick={() => { resetModal(); setModalMode("service"); setShowModal(true); }} className="bg-[#DC2626] text-white px-4 py-2 rounded-lg flex items-center gap-2">
                New Service
              </button>
              {activeTab === "vehicle" && (
                <button onClick={() => { resetModal(); setModalMode("type"); setShowModal(true); }} className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                  New Service Type
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-4 mb-6">
            {["vehicle", "equipment"].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg capitalize ${activeTab === tab ? "bg-red-600 text-white" : "bg-white border"}`}>
                {tab} Services
              </button>
            ))}
          </div>

          {error && <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">{error}</div>}

          <div className="space-y-4">
            {initialLoading ? (
              [...Array(5)].map((_, i) => <CategoryCardSkeleton key={i} />)
            ) : categories[activeTab]?.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">
                No {activeTab} categories found.
              </div>
            ) : (
              categories[activeTab]?.map(category => (
                <div key={category.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                  {/* Accordion Header (Card click karne par toggle hoga) */}
                  <div
                    onClick={() => toggleExpand(category.id)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-red-50 p-2 rounded-lg overflow-hidden">
                        {(category.icon || category.iconUrl) ? (
                          <img
                            src={category.icon || category.iconUrl}
                            alt={`${category.name} icon`}
                            className="w-8 h-8 object-contain"
                            loading="lazy"
                          />
                        ) : (
                          <Folder size={20} className="text-red-600" />
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-gray-800">{category.name}</h3>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-500">
                        {category.detailsLoaded || activeTab === "equipment"
                          ? `${category.items?.length ?? 0} Services`
                          : loadingVehicleIds.has(category.id)
                            ? "Loading..."
                            : "Expand to load"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditVehicleModal(category);
                        }}
                        className="p-2 rounded-lg hover:bg-gray-100"
                      >
                        <Edit2 size={18} className="text-gray-500" />
                      </button>
                      {activeTab === "vehicle" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openBrandsModal(category.id);
                          }}
                          className="p-2 rounded-lg hover:bg-gray-100"
                          title="Manage Brands"
                        >
                          <Plus size={16} className="text-gray-500" />
                        </button>
                      )}
                      {activeTab === "vehicle" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!window.confirm("Delete this vehicle and all its services?")) return;
                            handleDeleteVehicle(category.id);
                          }}
                          className="p-2 rounded-lg hover:bg-gray-100"
                          title="Delete Vehicle"
                        >
                          <Trash2 size={18} className="text-gray-500" />
                        </button>
                      )}
                      {expandedId === category.id ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
                    </div>
                  </div>

                  {/* Accordion Body (Expanded hone par hi dikhega) */}
                  {expandedId === category.id && (
                    loadingVehicleIds.has(category.id) || (activeTab === "vehicle" && !category.detailsLoaded) ? (
                      <ServiceListSkeleton />
                    ) : (
                      <div className="p-4 border-t bg-gray-50/50 space-y-4 animate-in fade-in slide-in-from-top-2">
                        {category.items.length === 0 ? (
                          <p className="text-center text-gray-400 text-sm py-4">No services added yet.</p>
                        ) : (
                          <div className="grid grid-cols-1 gap-4">
                            {category.items.map(item => (
                              <div key={item.id} className="border rounded-lg p-4 bg-white shadow-sm">
                                <div className="flex items-center justify-between font-semibold mb-3 border-b pb-2">
                                  <div className="flex items-center gap-3">
                                    <img src={item.iconUrl || item.icon || item.icon_url} className="w-8 h-8 object-contain" alt={item.name || "service icon"} loading="lazy" />
                                    <span className="flex-1 text-gray-700">{item.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => activeTab === "equipment" ? openEditEquipmentModal(item) : openEditServiceModal(item, category.id)}
                                      className="p-2 rounded-lg hover:bg-gray-100"
                                      title={activeTab === "equipment" ? "Edit Equipment" : "Edit Service"}
                                    >
                                      <Edit2 size={18} className="text-gray-500" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!window.confirm(activeTab === "equipment" ? "Delete this equipment?" : "Delete this service?")) return;
                                        if (activeTab === "equipment") {
                                          handleDeleteEquipment(item.id);
                                        } else {
                                          handleDeleteService(category.id, item.id);
                                        }
                                      }}
                                      className="p-2 rounded-lg hover:bg-gray-100"
                                      title={activeTab === "equipment" ? "Delete Equipment" : "Delete Service"}
                                    >
                                      <Trash2 size={18} className="text-gray-500" />
                                    </button>
                                  </div>
                                </div>

                                {/* Service Types inside the Service with brand/model filters */}
                                <div className="space-y-3">
                                  <div className="flex items-center gap-3">
                                    <label className="text-sm font-medium">Filter:</label>
                                    <select className="border p-2 rounded-lg" value={selectedBrandByService[item.id] || ''} onChange={(e) => handleFilterBrandChange(item.id, category.id, e.target.value)}>
                                      <option value="">Show All Brands</option>
                                      {(vehicleBrands[category.id] || []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>

                                    <select className="border p-2 rounded-lg" value={selectedModelByService[item.id] || ''} onChange={(e) => handleFilterModelChange(item.id, category.id, selectedBrandByService[item.id], e.target.value)} disabled={!selectedBrandByService[item.id]}>
                                      <option value="">Show All Models</option>
                                      {(modelsByBrand[selectedBrandByService[item.id]] || []).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                  </div>

                                  {/* Types list: either filtered or aggregated */}
                                  {loadingFilteredTypesByService[item.id] ? (
                                    <div className="text-sm text-gray-500">Loading types...</div>
                                  ) : (filteredTypesByService[item.id] && Array.isArray(filteredTypesByService[item.id]) ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                      {filteredTypesByService[item.id].map(type => (
                                        <div key={type.id} className="bg-gray-50 p-3 rounded border flex items-center justify-between gap-3 group">
                                          <div className="flex items-center gap-3 flex-1">
                                            <img src={type.imageUrl || type.image || type.image_url} className="w-10 h-10 rounded object-cover" alt="" />
                                            <div className="text-sm">
                                              <p className="font-bold text-gray-800">{type.name}</p>

                                              <p className="font-semibold text-gray-800">{type.subdescription}</p>
                                              <TypeText text={type.description} className="font-bold text-gray-800" />
                                              <p className="text-sm text-gray-500">{type.estimatedTime ? `Estimated Time: ${type.estimatedTime}` : ''}</p>
                                              {/* {(type._brandName || type._modelName) && (
                                            <p className="text-xs text-gray-500">{type._brandName ? `Brand: ${type._brandName}` : ''}{type._brandName && type._modelName ? ' | ' : ''}{type._modelName ? `Model: ${type._modelName}` : ''}</p>
                                          )} */}
                                              <p className="text-red-600 font-semibold"> Original Price: ₹{type.price}</p>
                                              {((type.discountPrice ?? type.discount_price) || 0) > 0 && (
                                                <p className="text-sm font-medium text-green-600">Discount Price: ₹{type.discountPrice ?? type.discount_price}</p>
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex gap-2">
                                            <button type="button" onClick={() => openEditTypeModal(type, item.id, category.id)} className="p-1 rounded hover:bg-gray-200" title="Edit Service Type"><Edit2 size={16} className="text-gray-600" /></button>
                                            <button type="button" onClick={() => { if (!window.confirm("Delete this service type?")) return; handleDeleteType(category.id, item.id, type.id); }} className="p-1 rounded hover:bg-gray-200" title="Delete Service Type"><Trash2 size={16} className="text-gray-600" /></button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                      {item.types.map(type => (
                                        <div key={type.id} className="bg-gray-50 p-3 rounded border flex items-center justify-between gap-3 group">
                                          <div className="flex items-center gap-3 flex-1">
                                            <img src={type.imageUrl} className="w-10 h-10 rounded object-cover" alt="" />
                                            <div className="text-sm">
                                              <p className="font-bold text-gray-800">{type.name}</p>
                                              <p className="font-semibold text-gray-700">{type.subdescription}</p>
                                              <TypeText text={type.description} className="font-bold text-gray-600" />
                                              <p className="text-sm text-gray-500">{type.estimatedTime ? `Estimated Time: ${type.estimatedTime}` : ''}</p>
                                              {/* {(type._brandName || type._modelName) && (
                                            <p className="text-xs text-gray-500">{type._brandName ? `Brand: ${type._brandName}` : ''}{type._brandName && type._modelName ? ' | ' : ''}{type._modelName ? `Model: ${type._modelName}` : ''}</p>
                                          )} */}
                                              <p className="text-red-600 font-semibold"> Original Price: ₹{type.price}</p>
                                              {((type.discountPrice ?? type.discount_price) || 0) > 0 && (
                                                <p className="text-sm font-medium text-green-600">Discount Price: ₹{type.discountPrice ?? type.discount_price}</p>
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex gap-2">
                                            <button type="button" onClick={() => openEditTypeModal(type, item.id, category.id)} className="p-1 rounded hover:bg-gray-200" title="Edit Service Type"><Edit2 size={16} className="text-gray-600" /></button>
                                            <button type="button" onClick={() => { if (!window.confirm("Delete this service type?")) return; handleDeleteType(category.id, item.id, type.id); }} className="p-1 rounded hover:bg-gray-200" title="Delete Service Type"><Trash2 size={16} className="text-gray-600" /></button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              ))
            )}
          </div>
        </main>
      </div>

      {/* Modal code remains the same... */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between mb-4 border-b pb-2">
              <h3 className="text-xl font-bold">
                {modalMode === "type"
                  ? "Add Service Type"
                  : modalMode === "editType"
                    ? "Edit Service Type"
                    : modalMode === "vehicle"
                      ? "Add Vehicle"
                      : modalMode === "editVehicle"
                        ? "Edit Vehicle"
                        : modalMode === "editService"
                          ? "Edit Service"
                          : modalMode === "editEquipment"
                            ? "Edit Equipment"
                            : "Add Service"}
              </h3>
              <X className="cursor-pointer hover:text-red-600" onClick={() => setShowModal(false)} />
            </div>

            <div className="space-y-4">
              {modalMode === "editType" ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Type Name</label>
                    <input
                      type="text"
                      placeholder="Basic Service"
                      className="w-full border p-2 rounded-lg"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Subdescription (Optional)</label>
                    <input
                      type="text"
                      placeholder="(Every 3,000 km or 3 Months)"
                      className="w-full border p-2 rounded-lg"
                      value={subdescription}
                      onChange={(e) => setSubdescription(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Price</label>
                    <input
                      type="number"
                      placeholder="Price (e.g. 500)"
                      className="w-full border p-2 rounded-lg"
                      value={itemPrice}
                      onChange={(e) => setItemPrice(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Discount Price</label>
                    <input
                      type="number"
                      placeholder="Discount Price (default 0)"
                      className="w-full border p-2 rounded-lg"
                      value={itemDiscountPrice}
                      onChange={(e) => setItemDiscountPrice(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                      placeholder="What's Included: Engine oil level............"
                      className="w-full border p-2 rounded-lg"
                      value={itemDesc}
                      onChange={(e) => setItemDesc(e.target.value)}
                      rows="3"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Estimated Time</label>
                    <input
                      type="text"
                      placeholder="Estimated Time (e.g. 30 mins)"
                      className="w-full border p-2 rounded-lg"
                      value={estimatedTime}
                      onChange={(e) => setEstimatedTime(e.target.value)}
                    />
                  </div>
                  <div className="mt-5">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Select Brands & Models
                    </label>

                    <div className="border rounded-xl bg-gray-50 p-4 max-h-80 overflow-y-auto space-y-4">

                      {brandsList.length === 0 && (
                        <p className="text-sm text-gray-500">
                          No brands available.
                        </p>
                      )}

                      {brandsList.map((brand) => {
                        const brandSelected = selectedBrandIds.includes(brand.id);
                        return (
                          <div
                            key={brand.id}
                            className={`border rounded-lg shadow-sm ${brandSelected ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}
                          >
                            {/* Brand Header */}
                            <div className={`flex items-center px-4 py-3 border-b ${brandSelected ? 'bg-red-100' : 'bg-white'}`}>
                              <input
                                type="checkbox"
                                className="w-4 h-4 accent-red-600"
                                checked={brandSelected}
                                onChange={() => toggleBrandSelection(brand.id)}
                              />

                              <span className={`ml-3 font-medium ${brandSelected ? 'text-red-700' : 'text-gray-800'}`}>
                                {brand.name}
                              </span>

                              {brandSelected && (
                                <span className="ml-auto inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                                  Selected
                                </span>
                              )}
                            </div>

                            {brandSelected && (
                              <div className="p-4">

                                <div className="flex justify-between items-center mb-3">
                                  <span className="text-sm font-medium text-gray-600">
                                    Models
                                  </span>

                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => selectAllModels(brand.id)}
                                      className="text-xs font-semibold px-3 py-1 rounded bg-red-100 text-red-800 hover:bg-red-200"
                                    >
                                      Select All
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => clearAllModels(brand.id)}
                                      className="text-xs font-semibold px-3 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                                    >
                                      Clear
                                    </button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                  {modelsByBrand[brand.id]?.length ? (
                                    modelsByBrand[brand.id].map((model) => {
                                      const modelSelected = selectedModelIdsByBrand[brand.id]?.has(model.id);
                                      return (
                                        <label
                                          key={model.id}
                                          className={`flex items-center gap-2 text-sm cursor-pointer rounded-lg border px-3 py-2 ${modelSelected ? 'bg-red-50 border-red-200 text-gray-700' : 'bg-white border-gray-200 text-gray-700'}`}
                                        >
                                          <input
                                            type="checkbox"
                                            className="w-4 h-4 accent-red-600"
                                            checked={modelSelected || false}
                                            onChange={() =>
                                              toggleModelSelection(brand.id, model.id)
                                            }
                                          />

                                          {model.name}
                                          {modelSelected && (
                                            <span className="ml-auto text-xs font-semibold text-red-700">Selected</span>
                                          )}
                                        </label>
                                      );
                                    })
                                  ) : (
                                    <p className="text-sm text-gray-400 col-span-full">
                                      No models available
                                    </p>
                                  )}
                                </div>

                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Upload Image</label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center justify-center px-4 py-2 border border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all">
                        <span className="text-sm text-gray-600 font-medium">
                          Upload Image
                        </span>
                        <input
                          type="file"
                          onChange={handleIconUpload}
                          className="hidden"
                        />
                      </label>
                      {iconPreview && (
                        <div className="relative">
                          <img
                            src={iconPreview}
                            alt="preview"
                            className="w-14 h-14 rounded-xl border shadow-sm object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setIconFile(null);
                              setIconPreview(null);
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shadow hover:bg-red-600"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : modalMode === "type" ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Select Vehicle</label>
                    <select className="w-full border p-2 rounded-lg" onChange={(e) => handleVehicleSelect(e.target.value)} value={selectedCategoryId || ''}>
                      <option value="">Choose Vehicle</option>
                      {categories.vehicle.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Select Service</label>
                    <select className="w-full border p-2 rounded-lg" onChange={(e) => setSelectedServiceId(e.target.value)} value={selectedServiceId || ''} disabled={!selectedCategoryId || loadingVehicleIds.has(selectedCategoryId)}>
                      <option value="">{loadingVehicleIds.has(selectedCategoryId) ? "Loading services..." : "Choose Service"}</option>
                      {categories.vehicle.find(v => v.id === selectedCategoryId)?.items.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Type Name</label>
                    <input type="text" placeholder="Basic Service" className="w-full border p-2 rounded-lg" value={itemName} onChange={(e) => setItemName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">SubDescription (Optional)</label>
                    <textarea placeholder="(Every 3,000 km or 3 Months)" className="w-full border p-2 rounded-lg" value={subdescription} onChange={(e) => setSubdescription(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Price</label>
                      <input type="number" placeholder="Price (e.g. 500)" className="w-full border p-2 rounded-lg" value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Discount Price</label>
                      <input type="number" placeholder="Discount Price (default 0)" className="w-full border p-2 rounded-lg" value={itemDiscountPrice} onChange={(e) => setItemDiscountPrice(e.target.value)} />
                    </div>
                  </div>


                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea placeholder="What's Included: Engine oil level................." className="w-full border p-2 rounded-lg" value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Estimated Time</label>
                    <input
                      type="text"
                      placeholder="Estimated Time (e.g. 30 mins)"
                      className="w-full border p-2 rounded-lg"
                      value={estimatedTime}
                      onChange={(e) => setEstimatedTime(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Select Brand(s)</label>
                    <div className="flex flex-wrap gap-2">
                      {brandLoading && brandsList.length === 0 ? (
                        <div className="text-sm text-gray-400">Loading brands...</div>
                      ) : brandsList.length === 0 ? (
                        <div className="text-sm text-gray-400">No brands found for this vehicle.</div>
                      ) : (
                        brandsList.map(b => {
                          const selected = selectedBrandIds.includes(b.id);
                          return (
                            <button key={b.id} type="button" onClick={() => toggleBrandSelection(b.id)} className={`px-3 py-1 rounded-full border ${selected ? 'bg-red-600 text-white' : 'bg-white text-gray-700'}`}>
                              {b.name}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Models grid for selected brands */}
                  {selectedBrandIds.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Select Models</label>
                      <div className="space-y-3 max-h-48 overflow-y-auto border rounded p-2">
                        {selectedBrandIds.map((brandId) => (
                          <div key={brandId} className="mb-2">
                            <div className="flex items-center justify-between mb-2">
                              <strong>{brandsList.find(b => b.id === brandId)?.name || 'Brand'}</strong>
                              <div className="text-sm text-gray-500">
                                <button type="button" onClick={() => {
                                  // select all models for brand
                                  const models = modelsByBrand[brandId] || [];
                                  setSelectedModelIdsByBrand((prev) => ({ ...prev, [brandId]: new Set(models.map(m => m.id)) }));
                                }} className="mr-2 underline">Select all</button>
                                <button type="button" onClick={() => setSelectedModelIdsByBrand((prev) => { const copy = { ...prev }; copy[brandId] = new Set(); return copy; })} className="underline">Clear</button>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {(modelsByBrand[brandId] || []).map(m => {
                                const setForBrand = selectedModelIdsByBrand[brandId] ? new Set(selectedModelIdsByBrand[brandId]) : new Set();
                                const checked = setForBrand.has(m.id);
                                return (
                                  <label key={m.id} className="flex items-center gap-2 px-2 py-1 border rounded-lg">
                                    <input type="checkbox" checked={checked} onChange={() => toggleModelSelection(brandId, m.id)} />
                                    <span className="text-sm">{m.name}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-1">Upload Image (Size: 1080 x 340 px)</label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center justify-center px-4 py-2 border border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all">
                        <span className="text-sm text-gray-600 font-medium">Upload Image</span>
                        <input type="file" onChange={handleIconUpload} className="hidden" />
                      </label>
                      {iconPreview && (
                        <div className="relative">
                          <img src={iconPreview} alt="preview" className="w-14 h-14 rounded-xl border shadow-sm object-cover" />
                          <button type="button" onClick={() => { setIconFile(null); setIconPreview(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shadow hover:bg-red-600">✕</button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : modalMode === "vehicle" ? (
                <>
                  <input
                    type="text"
                    placeholder="Vehicle Name"
                    className="w-full border p-2 rounded-lg"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                  />

                  <div>
                    <label className="block text-sm font-medium mb-1">Upload Icon/Image (Size: 36 x 36 px)</label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center justify-center px-4 py-2 border border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all">
                        <span className="text-sm text-gray-600 font-medium">Upload Icon/Image</span>
                        <input type="file" onChange={handleIconUpload} className="hidden" />
                      </label>
                      {iconPreview && (
                        <div className="relative">
                          <img src={iconPreview} alt="preview" className="w-14 h-14 rounded-xl border shadow-sm object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              setIconFile(null);
                              setIconPreview(null);
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shadow hover:bg-red-600"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : modalMode === "editVehicle" ? (
                <>
                  <input
                    type="text"
                    placeholder="Vehicle Name"
                    className="w-full border p-2 rounded-lg"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                  />

                  <div>
                    <label className="block text-sm font-medium mb-1">Upload Icon/Image (Size: 36 x 36 px)</label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center justify-center px-4 py-2 border border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all">
                        <span className="text-sm text-gray-600 font-medium">Upload Icon/Image</span>
                        <input type="file" onChange={handleIconUpload} className="hidden" />
                      </label>
                      {iconPreview && (
                        <div className="relative">
                          <img src={iconPreview} alt="preview" className="w-14 h-14 rounded-xl border shadow-sm object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              setIconFile(null);
                              setIconPreview(null);
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shadow hover:bg-red-600"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : modalMode === "editService" ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Service Name</label>
                    <input
                      type="text"
                      placeholder="Service Name"
                      className="w-full border p-2 rounded-lg"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Upload Icon/Image (Size: 36 x 36 px)</label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center justify-center px-4 py-2 border border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all">
                        <span className="text-sm text-gray-600 font-medium">Upload Icon/Image</span>
                        <input type="file" onChange={handleIconUpload} className="hidden" />
                      </label>
                      {iconPreview && (
                        <div className="relative">
                          <img src={iconPreview} alt="preview" className="w-14 h-14 rounded-xl border shadow-sm object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              setIconFile(null);
                              setIconPreview(null);
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shadow hover:bg-red-600"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : modalMode === "editEquipment" ? (
                <input
                  type="text"
                  placeholder="Equipment Name"
                  className="w-full border p-2 rounded-lg"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                />
              ) : (
                <>
                  {activeTab === "vehicle" && (
                    <select
                      className="w-full border p-2 rounded-lg"
                      value={selectedCategoryId}
                      onChange={(e) => handleVehicleSelect(e.target.value)}
                    >
                      <option value="">Choose Vehicle</option>
                      {categories.vehicle.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-1">Service Name</label>
                    <input
                      type="text"
                      placeholder="Service Name"
                      className="w-full border p-2 rounded-lg"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Upload Icon/Image (Size: 36 x 36 px)</label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center justify-center px-4 py-2 border border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all">
                        <span className="text-sm text-gray-600 font-medium">Upload Icon/Image</span>
                        <input type="file" onChange={handleIconUpload} className="hidden" />
                      </label>
                      {iconPreview && (
                        <div className="relative">
                          <img src={iconPreview} alt="preview" className="w-14 h-14 rounded-xl border shadow-sm object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              setIconFile(null);
                              setIconPreview(null);
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shadow hover:bg-red-600"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
              <button onClick={handleCreate} disabled={submitting} className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 disabled:opacity-60">
                {submitting ? "Processing..." : modalMode === "editService" || modalMode === "editVehicle" || modalMode === "editType" || modalMode === "editEquipment" ? "Update" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Brand Modal */}
      {showBrandModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between mb-4 border-b pb-2">
              <h3 className="text-xl font-bold">Manage Brands</h3>
              <X className="cursor-pointer hover:text-red-600" onClick={resetBrandModal} />
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Brand Name</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 border p-2 rounded-lg"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="e.g. Honda"
                  />
                  {editingBrandIdLocal ? (
                    <button onClick={handleUpdateBrand} disabled={brandLoading} className="bg-yellow-500 text-white px-4 py-2 rounded-lg">{brandLoading ? 'Updating...' : 'Update'}</button>
                  ) : (
                    <button onClick={handleCreateBrand} disabled={brandLoading} className="bg-red-600 text-white px-4 py-2 rounded-lg">{brandLoading ? 'Creating...' : 'Create'}</button>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Existing Brands</h4>
                {brandLoading && brandsList.length === 0 ? (
                  <div className="space-y-2">
                    {[...Array(4)].map((_, i) => <ListItemSkeleton key={i} />)}
                  </div>
                ) : brandsList.length === 0 ? (
                  <p className="text-sm text-gray-400">No brands yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {brandsList.map((b) => (
                      <li key={b.id} className="flex items-center justify-between border p-2 rounded-lg">
                        <span className="text-gray-700">{b.name}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => selectBrandModels(b.id)}
                            className="p-2 rounded hover:bg-gray-100"
                            title="View Models"
                          >
                            <Search size={16} className="text-gray-600" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingBrandIdLocal(b.id);
                              setBrandName(b.name || "");
                            }}
                            className="p-2 rounded hover:bg-gray-100"
                            title="Edit Brand"
                          >
                            <Edit2 size={16} className="text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteBrand(b.id)}
                            className="p-2 rounded hover:bg-gray-100"
                            title="Delete Brand"
                          >
                            <Trash2 size={16} className="text-gray-600" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {selectedBrandId && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold">Models for {brandsList.find((b) => b.id === selectedBrandId)?.name || "Selected Brand"}</h4>
                      <p className="text-sm text-gray-500">Create or manage models under this brand.</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedBrandId(null);
                        setModelsList([]);
                        setModelName("");
                        setEditingModelId(null);
                      }}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Close selection
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="flex-1 border p-2 rounded-lg"
                        value={modelName}
                        onChange={(e) => setModelName(e.target.value)}
                        placeholder="e.g. i20"
                      />
                      {editingModelId ? (
                        <button onClick={handleUpdateModel} disabled={modelLoading} className="bg-yellow-500 text-white px-4 py-2 rounded-lg">{modelLoading ? 'Updating...' : 'Update'}</button>
                      ) : (
                        <button onClick={handleCreateModel} disabled={modelLoading} className="bg-red-600 text-white px-4 py-2 rounded-lg">{modelLoading ? 'Creating...' : 'Create'}</button>
                      )}
                    </div>

                    {modelLoading && modelsList.length === 0 ? (
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => <ListItemSkeleton key={i} />)}
                      </div>
                    ) : modelsList.length === 0 ? (
                      <p className="text-sm text-gray-400">No models yet for this brand.</p>
                    ) : (
                      <ul className="space-y-2">
                        {modelsList.map((m) => (
                          <li key={m.id} className="flex items-center justify-between border p-2 rounded-lg">
                            <span className="text-gray-700">{m.name}</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => selectModelFuels(m.id)}
                                className="p-2 rounded hover:bg-gray-100"
                                title="View Fuels"
                              >
                                <Search size={16} className="text-gray-600" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingModelId(m.id);
                                  setModelName(m.name || "");
                                }}
                                className="p-2 rounded hover:bg-gray-100"
                                title="Edit Model"
                              >
                                <Edit2 size={16} className="text-gray-600" />
                              </button>
                              <button
                                onClick={() => handleDeleteModel(m.id)}
                                className="p-2 rounded hover:bg-gray-100"
                                title="Delete Model"
                              >
                                <Trash2 size={16} className="text-gray-600" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {selectedModelId && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold">Fuels for {modelsList.find((m) => m.id === selectedModelId)?.name || "Selected Model"}</h4>
                      <p className="text-sm text-gray-500">Create or manage fuel types under this model.</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedModelId(null);
                        setFuelsList([]);
                        setFuelName("");
                        setEditingFuelId(null);
                      }}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Close fuel list
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="flex-1 border p-2 rounded-lg"
                        value={fuelName}
                        onChange={(e) => setFuelName(e.target.value)}
                        placeholder="e.g. Petrol"
                      />
                      {editingFuelId ? (
                        <button onClick={handleUpdateFuel} disabled={fuelLoading} className="bg-yellow-500 text-white px-4 py-2 rounded-lg">{fuelLoading ? 'Updating...' : 'Update'}</button>
                      ) : (
                        <button onClick={handleCreateFuel} disabled={fuelLoading} className="bg-red-600 text-white px-4 py-2 rounded-lg">{fuelLoading ? 'Creating...' : 'Create'}</button>
                      )}
                    </div>

                    {fuelLoading && fuelsList.length === 0 ? (
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => <ListItemSkeleton key={i} />)}
                      </div>
                    ) : fuelsList.length === 0 ? (
                      <p className="text-sm text-gray-400">No fuels yet for this model.</p>
                    ) : (
                      <ul className="space-y-2">
                        {fuelsList.map((f) => (
                          <li key={f.id} className="flex items-center justify-between border p-2 rounded-lg">
                            <span className="text-gray-700">{f.name}</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingFuelId(f.id);
                                  setFuelName(f.name || "");
                                }}
                                className="p-2 rounded hover:bg-gray-100"
                                title="Edit Fuel"
                              >
                                <Edit2 size={16} className="text-gray-600" />
                              </button>
                              <button
                                onClick={() => handleDeleteFuel(f.id)}
                                className="p-2 rounded hover:bg-gray-100"
                                title="Delete Fuel"
                              >
                                <Trash2 size={16} className="text-gray-600" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {selectedModelId && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold">Engine CC for {modelsList.find((m) => m.id === selectedModelId)?.name || "Selected Model"}</h4>
                      <p className="text-sm text-gray-500">Create or manage engine cubic capacities.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="flex-1 border p-2 rounded-lg"
                        value={engineCCName}
                        onChange={(e) => setEngineCCName(e.target.value)}
                        placeholder="e.g. 500 CC"
                      />
                      {editingEngineCCId ? (
                        <button onClick={handleUpdateEngineCC} disabled={engineCCLoading} className="bg-yellow-500 text-white px-4 py-2 rounded-lg">{engineCCLoading ? 'Updating...' : 'Update'}</button>
                      ) : (
                        <button onClick={handleCreateEngineCC} disabled={engineCCLoading} className="bg-red-600 text-white px-4 py-2 rounded-lg">{engineCCLoading ? 'Creating...' : 'Create'}</button>
                      )}
                    </div>

                    {engineCCLoading && engineCCList.length === 0 ? (
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => <ListItemSkeleton key={i} />)}
                      </div>
                    ) : engineCCList.length === 0 ? (
                      <p className="text-sm text-gray-400">No engine CCs yet for this model.</p>
                    ) : (
                      <ul className="space-y-2">
                        {engineCCList.map((e) => (
                          <li key={e.id} className="flex items-center justify-between border p-2 rounded-lg">
                            <span className="text-gray-700">{e.name}</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingEngineCCId(e.id);
                                  setEngineCCName(e.name || "");
                                }}
                                className="p-2 rounded hover:bg-gray-100"
                                title="Edit Engine CC"
                              >
                                <Edit2 size={16} className="text-gray-600" />
                              </button>
                              <button
                                onClick={() => handleDeleteEngineCC(e.id)}
                                className="p-2 rounded hover:bg-gray-100"
                                title="Delete Engine CC"
                              >
                                <Trash2 size={16} className="text-gray-600" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button onClick={resetBrandModal} className="px-4 py-2 rounded-lg border">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateService;
